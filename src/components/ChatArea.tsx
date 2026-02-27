"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
    ArrowLeft, Check, ChevronDown, Crown, Edit2, Loader2,
    MessageCircle, CornerUpLeft, Send, Smile, Trash2,
    UserMinus, UserPlus, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { format, isToday } from "date-fns";
import AvatarLightbox from "./AvatarLightbox";

interface ChatAreaProps {
    conversationId: Id<"conversations">;
    onBack: () => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

// ─── Context Menu ──────────────────────────────────────────────────────────────
interface CtxMenu { x: number; y: number; message: any }

export default function ChatArea({ conversationId, onBack }: ChatAreaProps) {
    // ── Core state ──
    const [newMessage, setNewMessage] = useState("");
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [showMembersPanel, setShowMembersPanel] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);

    // ── Reply ──
    const [replyingTo, setReplyingTo] = useState<{ id: Id<"messages">; content: string; senderName: string } | null>(null);

    // ── Multi-select ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isSelecting = selectedIds.size > 0;

    // ── Desktop context menu (right-click) ──
    const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

    // ── Inline bubble dropdown ──
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // ── Admin panel ──
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [showAddMember, setShowAddMember] = useState(false);
    const [adminError, setAdminError] = useState<string | null>(null);

    // ── Refs ──
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const swipeStartXRef = useRef<number>(0);
    const swipeStartYRef = useRef<number>(0);
    const swipeMsgRef = useRef<{ id: string; el: HTMLDivElement } | null>(null);

    // ── Queries / Mutations ──
    const messages = useQuery(api.messages.getMessages, { conversationId });
    const conversations = useQuery(api.conversations.getMyConversations);
    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const deleteMessages = useMutation(api.messages.deleteMessages);
    const toggleReaction = useMutation(api.messages.toggleReaction);
    const markAsRead = useMutation(api.conversations.markAsRead);
    const setTyping = useMutation(api.typing.setTyping);
    const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId }) || [];
    // Admin
    const renameGroup = useMutation(api.conversations.renameGroup);
    const addGroupMember = useMutation(api.conversations.addGroupMember);
    const removeGroupMember = useMutation(api.conversations.removeGroupMember);
    const promoteToAdmin = useMutation(api.conversations.promoteToAdmin);
    const demoteAdmin = useMutation(api.conversations.demoteAdmin);
    const claimAdmin = useMutation(api.conversations.claimAdmin);
    const allUsers = useQuery(api.users.getUsers, showAddMember ? {} : "skip") as any[] | undefined;

    // ── Conversation details ──
    const currentConversation = conversations?.find(c => c._id === conversationId) as any;
    const isGroup = currentConversation?.isGroup ?? false;
    const conversationName = isGroup
        ? (currentConversation?.groupName ?? "Group Chat")
        : (currentConversation?.otherUser?.name ?? "Chat");
    const conversationImage = isGroup ? null : currentConversation?.otherUser?.image;
    const otherUserOnline = !isGroup && currentConversation?.otherUser?.isOnline;
    const groupMembers: any[] = isGroup ? (currentConversation?.groupMembers ?? []) : [];
    const groupDetails = useQuery(
        api.conversations.getGroupDetails,
        isGroup ? { conversationId } : "skip"
    ) as any;
    const iAmAdmin: boolean = groupDetails?.amIAdmin ?? false;
    const needsAdminClaim: boolean = groupDetails?.needsAdminClaim ?? false;
    const detailedMembers: any[] = groupDetails?.members ?? [];
    const memberIds = new Set(detailedMembers.map((m: any) => m._id));
    const nonMembers = (allUsers ?? []).filter((u: any) => !memberIds.has(u._id));

    // ── Auto-claim admin for legacy groups ──
    useEffect(() => {
        if (needsAdminClaim && iAmAdmin && isGroup) {
            claimAdmin({ conversationId }).catch(() => { });
        }
    }, [needsAdminClaim, iAmAdmin, isGroup, conversationId]); // eslint-disable-line

    // ── Scroll ──
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 120);
    };
    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };
    useEffect(() => {
        if (!messages || messages.length === 0) return;
        markAsRead({ conversationId });
        if (!scrollContainerRef.current) { scrollToBottom("instant"); return; }
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 200) scrollToBottom("smooth");
    }, [messages?.length, conversationId]); // eslint-disable-line

    // ── Close context menu AND inline dropdown on any outside click / right-click ──
    useEffect(() => {
        const close = () => { setCtxMenu(null); setOpenDropdownId(null); };
        window.addEventListener("click", close);
        window.addEventListener("contextmenu", close);
        return () => { window.removeEventListener("click", close); window.removeEventListener("contextmenu", close); };
    }, []);

    // ── Typing ──
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        setTyping({ conversationId, isTyping: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { setTyping({ conversationId, isTyping: false }); }, 2000);
    };

    // ── Send ──
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

    // ── Delete single ──
    const handleDelete = async (messageId: Id<"messages">) => {
        setCtxMenu(null);
        try { await deleteMessage({ messageId }); }
        catch (e) { console.error("Failed to delete", e); }
    };

    // ── Bulk delete (own msgs) ──
    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds) as Id<"messages">[];
        try {
            await deleteMessages({ messageIds: ids });
        } catch (e) { console.error("Bulk delete failed", e); }
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
        try { await toggleReaction({ messageId, emoji }); }
        catch (e) { console.error("Failed to react", e); }
    };

    // ── Reply helpers ──
    const startReply = useCallback((msg: any) => {
        setCtxMenu(null);
        setSelectedIds(new Set());
        setReplyingTo({ id: msg._id, content: msg.isDeleted ? "This message was deleted" : msg.content, senderName: msg.senderName });
        requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    // ── Right-click context menu ──
    const handleContextMenu = (e: React.MouseEvent, msg: any) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, message: msg });
    };

    // ── Mobile long-press → select mode ──
    const handleTouchStart = (e: React.TouchEvent, msg: any) => {
        const touch = e.touches[0];
        swipeStartXRef.current = touch.clientX;
        swipeStartYRef.current = touch.clientY;
        swipeMsgRef.current = null;
        // Long press timer
        longPressTimerRef.current = setTimeout(() => {
            if (!isSelecting) {
                setSelectedIds(new Set([msg._id]));
            }
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent, msg: any, el: HTMLDivElement) => {
        const touch = e.touches[0];
        const dx = touch.clientX - swipeStartXRef.current;
        const dy = Math.abs(touch.clientY - swipeStartYRef.current);
        // Cancel long press if user moves
        if (Math.abs(dx) > 10 || dy > 10) {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        }
        // Swipe right to reply (only if not in select mode and dx positive + mostly horizontal)
        if (!isSelecting && dx > 0 && dy < 40) {
            swipeMsgRef.current = { id: msg._id, el };
            const clamp = Math.min(dx, 80);
            el.style.transform = `translateX(${clamp}px)`;
            el.style.transition = "none";
        }
    };

    const handleTouchEnd = (e: React.TouchEvent, msg: any) => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        const touch = e.changedTouches[0];
        const dx = touch.clientX - swipeStartXRef.current;
        const dy = Math.abs(touch.clientY - swipeStartYRef.current);

        // Snap back
        if (swipeMsgRef.current) {
            swipeMsgRef.current.el.style.transform = "";
            swipeMsgRef.current.el.style.transition = "transform 0.2s ease";
        }

        // Swipe right ≥ 60px → reply
        if (!isSelecting && dx >= 60 && dy < 40 && !msg.isDeleted) {
            startReply(msg);
        }
        swipeMsgRef.current = null;
    };

    // ── Admin handlers ──
    const handleRename = async () => {
        if (!renameValue.trim()) return;
        try { await renameGroup({ conversationId, name: renameValue.trim() }); setIsRenaming(false); }
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

    // ── Time format ──
    const formatMessageTime = (timestamp: number) => {
        const date = new Date(timestamp);
        if (isToday(date)) return format(date, 'h:mm a');
        if (date.getFullYear() !== new Date().getFullYear()) return format(date, 'MMM d, yyyy h:mm a');
        return format(date, 'MMM d, h:mm a');
    };

    // ── Loading skeleton ──
    if (messages === undefined) {
        return (
            <div className="flex-1 flex flex-col h-full">
                <div className="h-16 px-4 bg-white border-b border-gray-100 flex items-center gap-3">
                    <button onClick={onBack} className="p-1.5 md:hidden text-gray-500 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="animate-pulse flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="space-y-1.5">
                            <div className="h-3 bg-gray-200 rounded w-28" />
                            <div className="h-2.5 bg-gray-100 rounded w-16" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center bg-slate-50">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
            {/* Lightbox */}
            {lightbox && <AvatarLightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)} />}

            {/* Desktop right-click context menu */}
            {ctxMenu && (
                <div
                    className="fixed z-[200] bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 min-w-[160px] overflow-hidden"
                    style={{ left: ctxMenu.x, top: ctxMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => startReply(ctxMenu.message)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <CornerUpLeft className="w-4 h-4 text-blue-500" /> Reply
                    </button>
                    {!ctxMenu.message.isDeleted && (
                        <div className="px-2 py-1">
                            <div className="flex gap-1.5 justify-around">
                                {REACTION_EMOJIS.map(e => (
                                    <button
                                        key={e}
                                        onClick={() => handleToggleReaction(ctxMenu.message._id, e)}
                                        className="text-base hover:scale-125 transition-transform"
                                    >{e}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {ctxMenu.message.isMe && !ctxMenu.message.isDeleted && (
                        <>
                            <div className="h-px bg-gray-100 my-1" />
                            <button
                                onClick={() => handleDelete(ctxMenu.message._id)}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── Header ── */}
            {isSelecting ? (
                /* Multi-select header */
                <div className="px-4 py-3 bg-blue-600 flex items-center gap-3 shadow-sm z-10 sticky top-0 flex-shrink-0 min-h-[64px]">
                    <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-white/80 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                    <span className="flex-1 text-white font-bold text-sm">{selectedIds.size} selected</span>
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            ) : (
                /* Normal header */
                <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center shadow-sm z-10 sticky top-0 flex-shrink-0 min-h-[64px]">
                    <button onClick={onBack} className="mr-2 p-1.5 md:hidden text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center flex-1 overflow-hidden gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {conversationImage ? (
                                <button onClick={() => setLightbox({ src: conversationImage, name: conversationName })} className="rounded-full">
                                    <img src={conversationImage} alt={conversationName} className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm hover:opacity-90 cursor-pointer" />
                                </button>
                            ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm ${isGroup ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 border-purple-50' : 'bg-gradient-to-br from-indigo-100 to-blue-100 text-blue-700 border-blue-50'}`}>
                                    {isGroup ? <Users className="w-5 h-5" /> : conversationName.charAt(0)}
                                </div>
                            )}
                            {!isGroup && otherUserOnline && (
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <button
                                onClick={() => isGroup && setShowMembersPanel(p => !p)}
                                className={`text-sm font-bold text-gray-800 truncate leading-tight block max-w-full text-left ${isGroup ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default'}`}
                            >
                                {conversationName}
                            </button>
                            {typingUsers.length > 0 ? (
                                <p className="text-xs text-blue-500 font-medium leading-tight animate-pulse truncate">
                                    {(typingUsers as any[]).map((u: any) => u.name?.split(' ')[0]).join(', ')} is typing...
                                </p>
                            ) : isGroup ? (
                                <button onClick={() => setShowMembersPanel(p => !p)} className="text-xs text-gray-400 hover:text-blue-500 text-left truncate block max-w-full transition-colors">
                                    {groupMembers.length > 0 ? `${groupMembers.length} members · ${groupMembers.filter((m: any) => m.isOnline).length} online` : 'Group chat'}
                                </button>
                            ) : (
                                <p className={`text-xs font-medium leading-tight ${otherUserOnline ? 'text-green-500' : 'text-gray-400'}`}>
                                    {otherUserOnline ? 'Active now' : 'Offline'}
                                </p>
                            )}
                        </div>
                        {/* Group stacked avatars */}
                        {isGroup && groupMembers.length > 0 && (
                            <div className="flex-shrink-0 flex items-center -space-x-2">
                                {groupMembers.slice(0, 4).map((m: any) => (
                                    <div key={m._id} className="relative" title={m.name}>
                                        {m.image ? (
                                            <img src={m.image} alt={m.name} className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">{m.name?.charAt(0)}</div>
                                        )}
                                        {m.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full" />}
                                    </div>
                                ))}
                                {groupMembers.length > 4 && (
                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">
                                        +{groupMembers.length - 4}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Group Members Panel ── */}
            {isGroup && showMembersPanel && (
                <div className="flex-shrink-0 bg-white border-b border-gray-100 shadow-sm">
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Members ({detailedMembers.length})</h3>
                            <div className="flex items-center gap-2">
                                {iAmAdmin && (
                                    <>
                                        <button onClick={() => { setShowAddMember(p => !p); setAdminError(null); }} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50">
                                            <UserPlus className="w-3.5 h-3.5" /> Add
                                        </button>
                                        <button onClick={() => { setIsRenaming(p => !p); setRenameValue(conversationName); setAdminError(null); }} className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 font-semibold px-2 py-1 rounded-lg hover:bg-purple-50">
                                            <Edit2 className="w-3.5 h-3.5" /> Rename
                                        </button>
                                    </>
                                )}
                                <button onClick={() => { setShowMembersPanel(false); setShowAddMember(false); setIsRenaming(false); }} className="text-[10px] text-gray-400 hover:text-gray-600">Hide</button>
                            </div>
                        </div>
                        {adminError && (
                            <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                                <span className="text-[11px] text-red-600">{adminError}</span>
                                <button onClick={() => setAdminError(null)}><X className="w-3 h-3 text-red-400" /></button>
                            </div>
                        )}
                        {isRenaming && (
                            <div className="mb-3 flex gap-2">
                                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false); }}
                                    placeholder="New group name..." className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400" />
                                <button onClick={handleRename} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Save
                                </button>
                                <button onClick={() => setIsRenaming(false)} className="px-2 py-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                        )}
                        {showAddMember && (
                            <div className="mb-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Add People</p>
                                {nonMembers.length === 0 ? (
                                    <p className="text-xs text-gray-400 py-2 text-center">Everyone is already in this group</p>
                                ) : (
                                    <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-1">
                                        {nonMembers.map((u: any) => (
                                            <button key={u._id} onClick={() => handleAddMember(u._id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 text-left">
                                                {u.image ? <img src={u.image} alt={u.name} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">{u.name?.charAt(0)}</div>}
                                                <span className="text-xs font-medium text-gray-800 flex-1 truncate">{u.name}</span>
                                                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {detailedMembers.map((m: any) => (
                                <div key={m._id} className="flex items-center gap-2 px-1 py-1 rounded-lg group/member hover:bg-gray-50">
                                    <div className="relative flex-shrink-0">
                                        {m.image ? (
                                            <button onClick={() => setLightbox({ src: m.image, name: m.name })} className="rounded-full">
                                                <img src={m.image} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-sm hover:opacity-90 cursor-pointer" />
                                            </button>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{m.name?.charAt(0)}</div>
                                        )}
                                        {m.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-gray-800 truncate">{m.name}</span>
                                            {m.isAdmin && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                                    <Crown className="w-2.5 h-2.5" /> Admin
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] ${m.isOnline ? 'text-green-500' : 'text-gray-400'}`}>{m.isOnline ? 'Online' : 'Offline'}</span>
                                    </div>
                                    {iAmAdmin && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                                            {m.isAdmin ? (
                                                <button onClick={() => handleDemote(m._id)} title="Remove admin" className="p-1 rounded-full text-amber-400 hover:text-amber-600 hover:bg-amber-50"><Crown className="w-3.5 h-3.5" /></button>
                                            ) : (
                                                <button onClick={() => handlePromote(m._id)} title="Make admin" className="p-1 rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50"><Crown className="w-3.5 h-3.5" /></button>
                                            )}
                                            <button onClick={() => handleRemoveMember(m._id)} title="Remove" className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"><UserMinus className="w-3.5 h-3.5" /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Messages ── */}
            <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto w-full px-4 sm:px-6 py-5 bg-slate-50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 border border-gray-100">
                            <MessageCircle className="w-8 h-8 text-blue-200" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">No messages yet</p>
                        <p className="text-xs mt-1 text-gray-400">Send the first message below!</p>
                    </div>
                ) : (
                    <div className="space-y-0 max-w-3xl mx-auto w-full pb-2">
                        {(messages as any[]).map((m: any, i: number) => {
                            const isMe = m.isMe;
                            const prev = messages[i - 1] as any;
                            const next = messages[i + 1] as any;
                            const isSameAsPrev = prev && prev.senderId === m.senderId;
                            const isSameAsNext = next && next.senderId === m.senderId;
                            const showAvatar = !isMe && !isSameAsPrev;
                            const isSelected = selectedIds.has(m._id);

                            // Date divider
                            const showDateDivider = !prev || new Date(prev._creationTime).toDateString() !== new Date(m._creationTime).toDateString();

                            // Bubble shape
                            const bubbleRadius = isMe
                                ? `rounded-2xl ${isSameAsPrev ? 'rounded-tr-md' : ''} ${isSameAsNext ? 'rounded-br-sm' : ''}`
                                : `rounded-2xl ${isSameAsPrev ? 'rounded-tl-md' : ''} ${isSameAsNext ? 'rounded-bl-sm' : ''}`;

                            return (
                                <div key={m._id}>
                                    {/* Date divider */}
                                    {showDateDivider && (
                                        <div className="flex items-center gap-3 my-4">
                                            <div className="flex-1 h-px bg-gray-200" />
                                            <span className="text-[11px] text-gray-400 font-medium bg-slate-50 px-2">
                                                {new Date(m._creationTime).toDateString() === new Date().toDateString() ? 'Today'
                                                    : new Date(m._creationTime).getFullYear() !== new Date().getFullYear()
                                                        ? new Date(m._creationTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                                        : new Date(m._creationTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            <div className="flex-1 h-px bg-gray-200" />
                                        </div>
                                    )}

                                    {/* Message row */}
                                    <div
                                        className={`flex items-end gap-2 w-full ${isSameAsPrev ? 'mt-0.5' : 'mt-3'} ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSelected ? (isMe ? 'bg-blue-50/60' : 'bg-gray-100/60') : ''} rounded-xl transition-colors`}
                                        onContextMenu={e => handleContextMenu(e, m)}
                                        onTouchStart={e => handleTouchStart(e, m)}
                                        onTouchMove={e => {
                                            // get the bubble element (first child div)
                                            const bubbleWrap = e.currentTarget.querySelector('.bubble-wrap') as HTMLDivElement;
                                            if (bubbleWrap) handleTouchMove(e, m, bubbleWrap);
                                        }}
                                        onTouchEnd={e => handleTouchEnd(e, m)}
                                    >
                                        {/* Select checkbox on mobile/select mode */}
                                        {isSelecting && (
                                            <button
                                                onClick={() => toggleSelect(m._id)}
                                                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 self-center flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </button>
                                        )}

                                        {/* DM avatar placeholder */}
                                        {!isMe && !isGroup && (
                                            <div className="w-8 flex-shrink-0 self-end">
                                                {showAvatar ? (
                                                    m.senderImage
                                                        ? <button onClick={() => setLightbox({ src: m.senderImage, name: m.senderName })} className="rounded-full"><img src={m.senderImage} alt={m.senderName} className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm hover:opacity-90 cursor-pointer" /></button>
                                                        : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 text-xs font-bold shadow-sm">{m.senderName?.charAt(0)}</div>
                                                ) : <div className="w-8" />}
                                            </div>
                                        )}

                                        {/* ── Bubble + actions ── */}
                                        <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'} group/msg`}>
                                            {/* Bubble */}
                                            <div className={`bubble-wrap flex flex-col max-w-[72%] sm:max-w-[60%] ${isMe ? 'items-end' : 'items-start'}`}
                                                onClick={() => isSelecting && toggleSelect(m._id)}>

                                                {/* Group sender name row */}
                                                {!isMe && !isSameAsPrev && isGroup && (
                                                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                                                        {m.senderImage ? (
                                                            <button onClick={() => setLightbox({ src: m.senderImage, name: m.senderName })} className="rounded-full flex-shrink-0">
                                                                <img src={m.senderImage} alt={m.senderName} className="w-5 h-5 rounded-full object-cover border border-gray-200 shadow-sm hover:opacity-90 cursor-pointer" />
                                                            </button>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 text-[9px] font-bold flex-shrink-0">{m.senderName?.charAt(0)}</div>
                                                        )}
                                                        <span className="text-[11px] font-bold text-indigo-500 leading-none">{m.senderName}</span>
                                                    </div>
                                                )}

                                                {/* Reply-to quoted block — same style in both sent & received */}
                                                {m.replyTo && (
                                                    <div
                                                        className="mb-1.5 px-3 py-2 rounded-lg border-l-[3px] max-w-full cursor-pointer bg-white/95 border-blue-500 shadow-sm hover:bg-white transition-colors"
                                                        onClick={() => {
                                                            const el = document.getElementById(`msg-${m.replyTo.id}`);
                                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            el?.classList.add('ring-2', 'ring-blue-400', 'rounded-xl');
                                                            setTimeout(() => el?.classList.remove('ring-2', 'ring-blue-400', 'rounded-xl'), 1500);
                                                        }}
                                                    >
                                                        <p className="text-[10px] font-bold mb-0.5 text-blue-600">
                                                            {m.replyTo.senderName}
                                                        </p>
                                                        <p className={`text-[12px] truncate text-gray-600 ${m.replyTo.isDeleted ? 'italic opacity-70' : ''}`}>
                                                            {m.replyTo.content}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Main bubble */}
                                                <div
                                                    id={`msg-${m._id}`}
                                                    className={`relative px-3.5 pt-2 pb-2 text-[14px] leading-snug break-words shadow-sm w-fit transition-all ${bubbleRadius} ${isMe ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-100'}`}
                                                >
                                                    {m.isDeleted ? (
                                                        <span className={`italic text-[13px] ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>This message was deleted</span>
                                                    ) : (
                                                        /* flex-wrap: text + timestamp flow inline; timestamp pushed right */
                                                        <span className="flex flex-wrap items-end gap-x-2">
                                                            <span className="whitespace-pre-wrap leading-snug">{m.content}</span>
                                                            <span className={`text-[10px] select-none leading-none ml-auto mt-0.5 flex-shrink-0 self-end ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                                {formatMessageTime(m._creationTime)}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {/* Timestamp for deleted messages */}
                                                    {m.isDeleted && (
                                                        <span className={`block text-right text-[10px] select-none leading-none mt-0.5 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                            {formatMessageTime(m._creationTime)}
                                                        </span>
                                                    )}
                                                    {/* Bubble tail */}
                                                    {!isSameAsPrev && (
                                                        <span className={`absolute bottom-0 ${isMe ? '-right-1.5 text-blue-600' : '-left-1.5 text-white'}`} style={{ fontSize: 0, lineHeight: 0 }}>
                                                            {isMe
                                                                ? <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M0 8 L8 0 L8 8 Z" /></svg>
                                                                : <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M8 8 L0 0 L0 8 Z" /></svg>
                                                            }
                                                        </span>
                                                    )}

                                                    {/* WhatsApp-style arrow inside bubble — top-right, appears on hover */}
                                                    {!m.isDeleted && !isSelecting && (
                                                        <div className="absolute top-0 right-0">
                                                            {/* gradient fade — only visible on hover, same timing as button */}
                                                            <div className={`absolute top-0 right-0 w-14 h-10 rounded-tr-2xl pointer-events-none opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 ${isMe ? 'bg-gradient-to-bl from-blue-600/70 to-transparent' : 'bg-gradient-to-bl from-white/90 to-transparent'}`} />
                                                            <button
                                                                onClick={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === m._id ? null : m._id); }}
                                                                className={`relative z-10 p-2 opacity-0 group-hover/msg:opacity-100 transition-opacity rounded-sm ${isMe ? 'text-blue-100 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                                                                title="More options"
                                                            >
                                                                <ChevronDown className="w-4 h-4" />
                                                            </button>
                                                            {/* Dropdown */}
                                                            {openDropdownId === m._id && (
                                                                <div className={`absolute top-5 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[120px] ${isMe ? 'right-0' : 'right-0'}`}
                                                                    onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => { startReply(m); setOpenDropdownId(null); }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        <CornerUpLeft className="w-3.5 h-3.5 text-blue-500" /> Reply
                                                                    </button>
                                                                    {isMe && (
                                                                        <button
                                                                            onClick={() => { handleDelete(m._id); setOpenDropdownId(null); }}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Reactions */}
                                                {m.reactions && m.reactions.length > 0 && (
                                                    <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        {m.reactions.map((r: any) => (
                                                            <button key={r.emoji} onClick={() => handleToggleReaction(m._id, r.emoji)}
                                                                className={`flex items-center gap-0.5 text-[12px] px-2 py-0.5 rounded-full border transition-all ${r.hasReacted ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'}`}>
                                                                <span>{r.emoji}</span>
                                                                <span className="text-[10px] font-medium">{r.count}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Emoji only: outside the bubble on hover ── */}
                                            {!m.isDeleted && !isSelecting && (
                                                <div className="flex items-center self-center flex-shrink-0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
                                                    <div className="relative group/react hidden sm:block">
                                                        <button className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-yellow-500 hover:border-yellow-300 shadow-sm transition-all">
                                                            <Smile className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full border border-gray-100 px-2 py-1.5 flex gap-1.5 opacity-0 invisible group-hover/react:opacity-100 group-hover/react:visible transition-all z-50 whitespace-nowrap">
                                                            {REACTION_EMOJIS.map(emoji => (
                                                                <button key={emoji} onClick={() => handleToggleReaction(m._id, emoji)} className="hover:scale-125 transition-transform text-base leading-none">{emoji}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                )}
            </div>

            {/* ── Scroll-to-bottom button ── */}
            {showScrollButton && (
                <button onClick={() => scrollToBottom()} className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm text-blue-600 shadow-lg border border-gray-100 rounded-full py-1.5 px-5 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 transition-all z-20">
                    ↓ New messages
                </button>
            )}

            {/* ── Error banner ── */}
            {sendError && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
                    <p className="text-xs text-red-600">{sendError}</p>
                    <button onClick={() => setSendError(null)} className="text-xs text-red-500 font-medium underline">Dismiss</button>
                </div>
            )}

            {/* ── Emoji picker panel ── */}
            {showEmojiPicker && (
                <div className="flex-shrink-0 bg-white border-t border-gray-100 shadow-inner px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add to message</p>
                    <div className="flex flex-wrap gap-1.5">
                        {['😀', '😂', '🥰', '😍', '😎', '🤔', '😢', '😡', '🤯', '🥳', '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙏', '👀', '💪',
                            '😅', '🤣', '😊', '😇', '🤩', '😴', '🫡', '🤝', '💀', '👻', '🐶', '🐱', '🌸', '⭐', '🌈', '🍕', '☕', '🎮', '🏆', '🚀',
                        ].map(emoji => (
                            <button key={emoji} type="button"
                                onClick={() => { setNewMessage(prev => prev + emoji); inputRef.current?.focus(); }}
                                className="text-xl hover:bg-gray-100 rounded-lg p-1 transition-colors leading-none">{emoji}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Reply preview bar ── */}
            {replyingTo && (
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-50 border-t border-blue-100">
                    <CornerUpLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-blue-600 mb-0.5">{replyingTo.senderName}</p>
                        <p className="text-xs text-gray-600 truncate">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/60">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Input bar ── */}
            <div className="px-3 py-2.5 bg-white border-t border-gray-100 flex-shrink-0 w-full z-10">
                <form onSubmit={handleSend} className="max-w-3xl mx-auto w-full flex items-center gap-2">
                    <button type="button" onClick={() => setShowEmojiPicker(p => !p)}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'bg-yellow-100 text-yellow-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}>
                        <Smile className="w-5 h-5" />
                    </button>
                    <input ref={inputRef} type="text"
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[14.5px] placeholder-gray-400"
                        placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : "Type a message..."}
                        value={newMessage}
                        onChange={handleTyping}
                        onFocus={() => setShowEmojiPicker(false)}
                    />
                    <button type="submit" disabled={!newMessage.trim()}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
