"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Loader2, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AvatarLightbox from "./AvatarLightbox";
import ContextMenu from "./chat/ContextMenu";
import ChatHeader from "./chat/ChatHeader";
import GroupMembersPanel from "./chat/GroupMembersPanel";
import MessageBubble from "./chat/MessageBubble";
import MessageInput from "./chat/MessageInput";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatAreaProps {
    conversationId: Id<"conversations">;
    onBack: () => void;
}

interface CtxMenuState {
    x: number;
    y: number;
    message: any;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatArea({ conversationId, onBack }: ChatAreaProps) {

    // ── Core state ──
    const [newMessage, setNewMessage] = useState("");
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [showMembersPanel, setShowMembersPanel] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [lightbox, setLightbox] = useState<{ src: string; name: string; isAvatar: boolean } | null>(null);
    const [adminError, setAdminError] = useState<string | null>(null);

    // ── Reply state ──
    const [replyingTo, setReplyingTo] = useState<{ id: Id<"messages">; content: string; senderName: string } | null>(null);

    // ── Multi-select state ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isSelecting = selectedIds.size > 0;

    // ── Desktop context menu ──
    const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

    // ── Inline bubble dropdown ──
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // ── Refs ──
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const swipeStartXRef = useRef<number>(0);
    const swipeStartYRef = useRef<number>(0);
    const swipeMsgRef = useRef<{ id: string; el: HTMLDivElement } | null>(null);
    const initialScrollDone = useRef(false);

    // ── Queries ──
    const messages = useQuery(api.messages.getMessages, { conversationId });
    const conversations = useQuery(api.conversations.getMyConversations);
    const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId }) || [];
    const groupDetails = useQuery(
        api.conversations.getGroupDetails,
        (conversations?.find(c => c._id === conversationId) as any)?.isGroup ? { conversationId } : "skip"
    ) as any;

    // ── Mutations ──
    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const deleteMessages = useMutation(api.messages.deleteMessages);
    const toggleReaction = useMutation(api.messages.toggleReaction);
    const markAsRead = useMutation(api.conversations.markAsRead);
    const setTyping = useMutation(api.typing.setTyping);
    const renameGroup = useMutation(api.conversations.renameGroup);
    const addGroupMember = useMutation(api.conversations.addGroupMember);
    const removeGroupMember = useMutation(api.conversations.removeGroupMember);
    const promoteToAdmin = useMutation(api.conversations.promoteToAdmin);
    const demoteAdmin = useMutation(api.conversations.demoteAdmin);
    const claimAdmin = useMutation(api.conversations.claimAdmin);

    // ── Derived conversation data ──
    const currentConversation = conversations?.find(c => c._id === conversationId) as any;
    const isGroup = currentConversation?.isGroup ?? false;
    const conversationName = isGroup
        ? (currentConversation?.groupName ?? "Group Chat")
        : (currentConversation?.otherUser?.name ?? "Chat");
    const conversationImage = isGroup ? null : (currentConversation?.otherUser?.image ?? null);
    const otherUserOnline = !isGroup && currentConversation?.otherUser?.isOnline;
    const groupMembers: any[] = isGroup ? (currentConversation?.groupMembers ?? []) : [];
    const iAmAdmin: boolean = groupDetails?.amIAdmin ?? false;
    const needsAdminClaim: boolean = groupDetails?.needsAdminClaim ?? false;
    const detailedMembers: any[] = groupDetails?.members ?? [];

    // Users NOT already in the group (for add-member feature)
    const allUsers = useQuery(api.users.getUsers, showMembersPanel ? {} : "skip") as any[] | undefined;
    const memberIds = new Set(detailedMembers.map((m: any) => m._id));
    const nonMembers = (allUsers ?? []).filter((u: any) => !memberIds.has(u._id));

    // ── Auto-claim admin for legacy groups ──
    useEffect(() => {
        if (needsAdminClaim && iAmAdmin && isGroup) {
            claimAdmin({ conversationId }).catch(() => { });
        }
    }, [needsAdminClaim, iAmAdmin, isGroup, conversationId]); // eslint-disable-line

    // ── Scroll helpers ──
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 120);
    };

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        initialScrollDone.current = false;
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, [conversationId]);

    useEffect(() => {
        if (!messages || messages.length === 0) return;
        markAsRead({ conversationId });
        if (!initialScrollDone.current) {
            scrollToBottom("instant");
            initialScrollDone.current = true;
        } else {
            if (!scrollContainerRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            if (scrollHeight - scrollTop - clientHeight < 200) scrollToBottom("smooth");
        }
    }, [messages?.length, conversationId]); // eslint-disable-line

    // ── Close dropdowns on outside click ──
    useEffect(() => {
        const close = () => { setCtxMenu(null); setOpenDropdownId(null); };
        window.addEventListener("click", close);
        window.addEventListener("contextmenu", close);
        return () => { window.removeEventListener("click", close); window.removeEventListener("contextmenu", close); };
    }, []);

    // ── Typing handler ──
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        setTyping({ conversationId, isTyping: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping({ conversationId, isTyping: false }), 2000);
    };

    // ── Send text ──
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        setSendError(null);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTyping({ conversationId, isTyping: false });
        const msg = newMessage;
        const reply = replyingTo;
        setNewMessage("");
        setReplyingTo(null);
        try {
            await sendMessage({ conversationId, content: msg, replyToId: reply?.id });
            scrollToBottom();
        } catch {
            setSendError("Failed to send. Tap to retry.");
            setNewMessage(msg);
            setReplyingTo(reply);
        }
    };

    // ── Send media (image/video) ──
    const handleSendMedia = async (fileId: Id<"_storage">, fileType: string) => {
        await sendMessage({ conversationId, content: "", fileId, fileType });
        scrollToBottom();
    };

    // ── Delete single ──
    const handleDelete = async (messageId: Id<"messages">) => {
        setCtxMenu(null);
        try { await deleteMessage({ messageId }); }
        catch (e) { console.error("Failed to delete", e); }
    };

    // ── Bulk delete ──
    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds) as Id<"messages">[];
        try { await deleteMessages({ messageIds: ids }); }
        catch (e) { console.error("Bulk delete failed", e); }
        setSelectedIds(new Set());
    };

    // ── Toggle select ──
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Reactions ──
    const handleToggleReaction = async (messageId: Id<"messages">, emoji: string) => {
        setCtxMenu(null);
        setSelectedIds(new Set()); // Clear selection when reacting like WhatsApp
        try { await toggleReaction({ messageId, emoji }); }
        catch (e) { console.error("Failed to react", e); }
    };

    // ── Reply ──
    const startReply = useCallback((msg: any) => {
        setCtxMenu(null);
        setSelectedIds(new Set());
        const content = msg.isDeleted
            ? "This message was deleted"
            : msg.fileType === "image" ? "📷 Photo"
                : msg.fileType === "video" ? "🎥 Video"
                    : msg.content;
        setReplyingTo({ id: msg._id, content, senderName: msg.senderName });

        requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    // ── Right-click context menu ──
    const handleContextMenu = (e: React.MouseEvent, msg: any) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, message: msg });
    };

    // ── Touch handlers (refs stay here) ──
    const handleTouchStart = (e: React.TouchEvent, msg: any) => {
        const touch = e.touches[0];
        swipeStartXRef.current = touch.clientX;
        swipeStartYRef.current = touch.clientY;
        swipeMsgRef.current = null;
        longPressTimerRef.current = setTimeout(() => {
            if (!isSelecting) setSelectedIds(new Set([msg._id]));
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent, msg: any, el: HTMLDivElement) => {
        const touch = e.touches[0];
        const dx = touch.clientX - swipeStartXRef.current;
        const dy = Math.abs(touch.clientY - swipeStartYRef.current);
        if (Math.abs(dx) > 10 || dy > 10) {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        }
        if (!isSelecting && Math.abs(dx) > 0 && dy < 40) {
            swipeMsgRef.current = { id: msg._id, el };
            // Swipe right (positive dx) or left (negative dx), clamp to 80px limit
            const clamp = dx > 0 ? Math.min(dx, 80) : Math.max(dx, -80);
            el.style.transform = `translateX(${clamp}px)`;
            el.style.transition = "none";
        }
    };

    const handleTouchEnd = (e: React.TouchEvent, msg: any) => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        const touch = e.changedTouches[0];
        const dx = touch.clientX - swipeStartXRef.current;
        const dy = Math.abs(touch.clientY - swipeStartYRef.current);
        if (swipeMsgRef.current) {
            swipeMsgRef.current.el.style.transform = "";
            swipeMsgRef.current.el.style.transition = "transform 0.2s ease";
        }
        // Trigger if swiped far enough left or right
        if (!isSelecting && Math.abs(dx) >= 60 && dy < 40 && !msg.isDeleted) startReply(msg);
        swipeMsgRef.current = null;
    };

    // ── Admin handlers ──
    const handleRename = async (name: string) => {
        try { await renameGroup({ conversationId, name }); }
        catch (e: any) { setAdminError(e.message ?? "Failed to rename"); }
    };
    const handleAddMember = async (userId: Id<"users">) => {
        try { await addGroupMember({ conversationId, userId }); }
        catch (e: any) { setAdminError(e.message ?? "Failed to add member"); }
    };
    const handleRemoveMember = async (userId: Id<"users">) => {
        try { await removeGroupMember({ conversationId, userId }); }
        catch (e: any) { setAdminError(e.message ?? "Failed to remove member"); }
    };
    const handlePromote = async (userId: Id<"users">) => {
        try { await promoteToAdmin({ conversationId, userId }); }
        catch (e: any) { setAdminError(e.message ?? "Failed to promote"); }
    };
    const handleDemote = async (userId: Id<"users">) => {
        try { await demoteAdmin({ conversationId, userId }); }
        catch (e: any) { setAdminError(e.message ?? "Failed to demote"); }
    };

    // ── Loading skeleton ──
    if (messages === undefined) {
        return (
            <div className="flex-1 flex flex-col h-full">
                <div className="h-16 px-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <button onClick={onBack} className="p-1.5 md:hidden text-gray-500 hover:bg-gray-100 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="animate-pulse flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="space-y-1.5">
                            <div className="h-3 bg-gray-200 rounded w-28" />
                            <div className="h-2.5 bg-gray-100 rounded w-16" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-gray-900">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                </div>
            </div>
        );
    }

    // ── Render ──
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-gray-900">
            {/* Avatar lightbox */}
            {lightbox && <AvatarLightbox src={lightbox.src} name={lightbox.name} isAvatar={lightbox.isAvatar} onClose={() => setLightbox(null)} />}


            {/* Right-click context menu */}
            {ctxMenu && (
                <ContextMenu
                    ctxMenu={ctxMenu}
                    onReply={startReply}
                    onReact={handleToggleReaction}
                    onDelete={handleDelete}
                    onSelect={(id) => { toggleSelect(id); setCtxMenu(null); }}
                />
            )}

            {/* Header */}
            <ChatHeader
                isSelecting={isSelecting}
                selectedCount={selectedIds.size}
                onBack={onBack}
                onBulkDelete={handleBulkDelete}
                onClearSelect={() => setSelectedIds(new Set())}
                conversationName={conversationName}
                isGroup={isGroup}
                otherUserOnline={otherUserOnline}
                typingUsers={typingUsers as any[]}
                groupMembers={groupMembers}
                conversationImage={conversationImage}
                onToggleMembersPanel={() => setShowMembersPanel(p => !p)}
                onOpenLightbox={(src, name) => setLightbox({ src, name, isAvatar: true })}
            />

            {/* Group members panel */}
            {isGroup && showMembersPanel && (
                <GroupMembersPanel
                    detailedMembers={detailedMembers}
                    iAmAdmin={iAmAdmin}
                    nonMembers={nonMembers}
                    conversationName={conversationName}
                    adminError={adminError}
                    onClose={() => setShowMembersPanel(false)}
                    onRename={handleRename}
                    onAddMember={handleAddMember}
                    onRemoveMember={handleRemoveMember}
                    onPromote={handlePromote}
                    onDemote={handleDemote}
                    onClearError={() => setAdminError(null)}
                    onOpenLightbox={(src, name) => setLightbox({ src, name, isAvatar: true })}
                />
            )}

            {/* Messages area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto w-full px-4 sm:px-6 py-5 chat-bg-area"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none">
                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700">
                            <MessageCircle className="w-8 h-8 text-blue-200 dark:text-blue-900" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No messages yet</p>
                        <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Send the first message below!</p>
                    </div>
                ) : (
                    <div className="space-y-0 max-w-3xl mx-auto w-full pb-2">
                        {(messages as any[]).map((m: any, i: number) => {
                            const prev = messages[i - 1] as any;
                            const next = messages[i + 1] as any;
                            return (
                                <MessageBubble
                                    key={m._id}
                                    message={m}
                                    isMe={m.isMe}
                                    isGroup={isGroup}
                                    isSelecting={isSelecting}
                                    isSelected={selectedIds.has(m._id)}
                                    isOnlySelected={isSelecting && selectedIds.size === 1 && selectedIds.has(m._id)}
                                    isSameAsPrev={!!(prev && prev.senderId === m.senderId)}
                                    isSameAsNext={!!(next && next.senderId === m.senderId)}
                                    showDateDivider={!prev || new Date(prev._creationTime).toDateString() !== new Date(m._creationTime).toDateString()}
                                    openDropdownId={openDropdownId}
                                    onReply={startReply}
                                    onDelete={handleDelete}
                                    onReact={handleToggleReaction}
                                    onSelect={toggleSelect}
                                    onSetDropdown={setOpenDropdownId}
                                    onContextMenu={handleContextMenu}
                                    onOpenLightbox={(src, name, isAvatar = true) => setLightbox({ src, name, isAvatar })}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                />
                            );
                        })}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                )}
            </div>

            {/* Scroll-to-bottom button */}
            {showScrollButton && (
                <button
                    onClick={() => scrollToBottom()}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm text-blue-600 dark:text-blue-400 shadow-lg border border-gray-100 dark:border-gray-700 rounded-full py-1.5 px-5 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all z-20"
                >
                    ↓ New messages
                </button>
            )}

            {/* Error banner */}
            {sendError && (
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-100 dark:border-red-900/50 flex items-center justify-between">
                    <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>
                    <button onClick={() => setSendError(null)} className="text-xs text-red-500 dark:text-red-400 font-medium underline">Dismiss</button>
                </div>
            )}

            {/* Bottom input area */}
            <MessageInput
                conversationId={conversationId}
                newMessage={newMessage}
                replyingTo={replyingTo}
                showEmojiPicker={showEmojiPicker}
                inputRef={inputRef}
                onChange={handleTyping}
                onSubmit={handleSend}
                onToggleEmoji={() => setShowEmojiPicker(p => !p)}
                onInsertEmoji={emoji => { setNewMessage(prev => prev + emoji); inputRef.current?.focus(); }}
                onCancelReply={() => setReplyingTo(null)}
                onInputFocus={() => setShowEmojiPicker(false)}
                onSendMedia={handleSendMedia}
            />
        </div>
    );
}
