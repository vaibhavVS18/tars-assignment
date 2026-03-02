"use client";

import { Check, ChevronDown, CornerUpLeft, MousePointer2, Smile, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { REACTION_EMOJIS, formatMessageTime } from "./utils";

interface MessageBubbleProps {
    message: any;
    isMe: boolean;
    isGroup: boolean;
    isSelecting: boolean;
    isSelected: boolean;
    isOnlySelected: boolean;
    isSameAsPrev: boolean;
    isSameAsNext: boolean;
    showDateDivider: boolean;
    openDropdownId: string | null;
    onReply: (msg: any) => void;
    onDelete: (messageId: Id<"messages">) => void;
    onReact: (messageId: Id<"messages">, emoji: string) => void;
    onSelect: (id: string) => void;
    onSetDropdown: (id: string | null) => void;
    onContextMenu: (e: React.MouseEvent, msg: any) => void;
    onOpenLightbox: (src: string, name: string, isAvatar?: boolean) => void;
    onTouchStart: (e: React.TouchEvent, msg: any) => void;
    onTouchMove: (e: React.TouchEvent, msg: any, el: HTMLDivElement) => void;
    onTouchEnd: (e: React.TouchEvent, msg: any) => void;
}

export default function MessageBubble({
    message: m, isMe, isGroup, isSelecting, isSelected, isOnlySelected,
    isSameAsPrev, isSameAsNext, showDateDivider, openDropdownId,
    onReply, onDelete, onReact, onSelect, onSetDropdown,
    onContextMenu, onOpenLightbox, onTouchStart, onTouchMove, onTouchEnd,
}: MessageBubbleProps) {
    const [reactionPopupOpen, setReactionPopupOpen] = useState(false);

    const bubbleRadius = isMe
        ? `rounded-2xl ${isSameAsPrev ? "rounded-tr-md" : ""} ${isSameAsNext ? "rounded-br-sm" : ""}`
        : `rounded-2xl ${isSameAsPrev ? "rounded-tl-md" : ""} ${isSameAsNext ? "rounded-bl-sm" : ""}`;

    const reactions: { emoji: string; count: number; hasReacted: boolean; users: { name: string; image?: string }[] }[] =
        m.reactions ?? [];
    const totalReactionCount = reactions.reduce((s: number, r: any) => s + r.count, 0);
    const visibleReactions = reactions.slice(0, 2);
    const hiddenCount = totalReactionCount - visibleReactions.reduce((s: number, r: any) => s + r.count, 0);

    return (
        <div key={m._id}>
            {/* ── Date divider ── */}
            {showDateDivider && (
                <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                    <span className="text-[11px] text-gray-400 font-medium bg-slate-50 dark:bg-gray-900 px-2">
                        {new Date(m._creationTime).toDateString() === new Date().toDateString()
                            ? "Today"
                            : new Date(m._creationTime).getFullYear() !== new Date().getFullYear()
                                ? new Date(m._creationTime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                                : new Date(m._creationTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>
            )}

            {/* ── Message row ── */}
            <div
                className={`flex items-end gap-2 w-full ${isSameAsPrev ? "mt-1" : "mt-3"} ${isSameAsNext ? "mb-1" : "mb-3"} ${isMe ? "flex-row-reverse" : "flex-row"} ${isSelected ? (isMe ? "bg-blue-200/80 dark:bg-blue-900/30" : "bg-indigo-100/80 dark:bg-gray-800/60") : ""} rounded-xl transition-colors ${isSelecting ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" : ""}`}
                onClick={() => { if (isSelecting) onSelect(m._id); }}
                onContextMenu={e => onContextMenu(e, m)}
                onTouchStart={e => onTouchStart(e, m)}
                onTouchMove={e => {
                    const bubbleWrap = e.currentTarget.querySelector(".bubble-wrap") as HTMLDivElement;
                    if (bubbleWrap) onTouchMove(e, m, bubbleWrap);
                }}
                onTouchEnd={e => onTouchEnd(e, m)}
            >
                {/* Select checkbox */}
                {isSelecting && (
                    <button
                        onClick={() => onSelect(m._id)}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 self-center flex items-center justify-center transition-colors ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"}`}
                    >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                )}

                {/* Avatar placeholder (DM only) */}
                {!isMe && !isGroup && (
                    <div className="w-8 flex-shrink-0 self-end">
                        {!isSameAsPrev ? (
                            m.senderImage
                                ? <button onClick={() => onOpenLightbox(m.senderImage, m.senderName)} className="rounded-full">
                                    <img src={m.senderImage} alt={m.senderName} className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm hover:opacity-90 cursor-pointer" />
                                </button>
                                : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 text-xs font-bold shadow-sm">
                                    {m.senderName?.charAt(0)}
                                </div>
                        ) : (
                            <div className="w-8" />
                        )}
                    </div>
                )}

                {/* ── Bubble + hover actions ── */}
                <div className={`flex items-end gap-1 ${isMe ? "flex-row-reverse" : "flex-row"} group/msg`}>

                    {/* Bubble wrapper */}
                    <div
                        className={`bubble-wrap flex flex-col max-w-[72%] sm:max-w-[60%] relative ${isMe ? "items-end" : "items-start"}`}
                        onClick={() => isSelecting && onSelect(m._id)}
                    >
                        {/* ── WhatsApp-like Mobile Reaction Picker (when exactly 1 message is selected) ── */}
                        {isOnlySelected && !m.isDeleted && (
                            <div className={`absolute bottom-full mb-1 cursor-default sm:hidden ${isMe ? "right-0" : "left-0"} bg-white dark:bg-gray-800 shadow-xl rounded-full border border-gray-100 dark:border-gray-700 px-3 py-2 flex gap-3 z-50 animate-fade-in`}>
                                {REACTION_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={(e) => { e.stopPropagation(); onReact(m._id, emoji); }}
                                        className="text-xl hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Group sender name */}
                        {!isMe && !isSameAsPrev && isGroup && (
                            <div className="flex items-center gap-1.5 mb-1 ml-1">
                                {m.senderImage ? (
                                    <button onClick={() => onOpenLightbox(m.senderImage, m.senderName)} className="rounded-full flex-shrink-0">
                                        <img src={m.senderImage} alt={m.senderName} className="w-5 h-5 rounded-full object-cover border border-gray-200 shadow-sm hover:opacity-90 cursor-pointer" />
                                    </button>
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 text-[9px] font-bold flex-shrink-0">
                                        {m.senderName?.charAt(0)}
                                    </div>
                                )}
                                <span className="text-[11px] font-bold text-indigo-500 leading-none truncate max-w-[150px]">{m.senderName}</span>
                            </div>
                        )}

                        {/* Reply-to quoted block */}
                        {m.replyTo && (
                            <div
                                className="mb-1.5 rounded-lg border-l-[3px] max-w-full cursor-pointer bg-white/95 dark:bg-gray-800/95 border-blue-500 shadow-sm hover:bg-white dark:hover:bg-gray-700 transition-colors overflow-hidden"
                                onClick={() => {
                                    const el = document.getElementById(`msg-${m.replyTo.id}`);
                                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    el?.classList.add("ring-2", "ring-blue-400", "rounded-xl");
                                    setTimeout(() => el?.classList.remove("ring-2", "ring-blue-400", "rounded-xl"), 1500);
                                }}
                            >
                                {m.replyTo.fileType === "image" && m.replyTo.fileUrl ? (
                                    <div className="flex items-center gap-2 pr-3">
                                        <img src={m.replyTo.fileUrl} alt="Replied photo" className="w-12 h-12 object-cover flex-shrink-0" />
                                        <div className="flex-1 min-w-0 py-1">
                                            <p className="text-[10px] font-bold text-blue-600 truncate">{m.replyTo.senderName}</p>
                                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <span>📷</span><span>Photo</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : m.replyTo.fileType === "video" ? (
                                    <div className="flex items-center gap-2 px-3 py-2">
                                        <span className="text-xl">🎥</span>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-blue-600 truncate">{m.replyTo.senderName}</p>
                                            <p className="text-[11px] text-gray-500">Video</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-3 py-2">
                                        <p className="text-[10px] font-bold mb-0.5 text-blue-600 truncate">{m.replyTo.senderName}</p>
                                        <p className={`text-[12px] truncate text-gray-600 ${m.replyTo.isDeleted ? "italic opacity-70" : ""}`}>
                                            {m.replyTo.content}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Main bubble */}
                        <div
                            id={`msg-${m._id}`}
                            className={`relative ${m.isDeleted ? "px-3.5 pt-2 pb-2" : (m.fileUrl && (m.fileType === "image" || m.fileType === "video") ? "p-1" : "px-3.5 pt-2 pb-2")} text-[14px] leading-snug break-words shadow-sm w-fit transition-all ${bubbleRadius} ${isMe ? "bg-blue-50 dark:bg-blue-900/40 text-gray-800 dark:text-blue-100 border border-blue-300 dark:border-blue-800/60" : "bg-white dark:bg-[#202C33] text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-800"}`}
                        >
                            {m.isDeleted ? (
                                <>
                                    <span className={`italic text-[13px] ${isMe ? "text-slate-500" : "text-gray-500"}`}>
                                        This message was deleted
                                    </span>
                                    <span className={`block text-right text-[10px] select-none leading-none mt-0.5 ${isMe ? "text-blue-400" : "text-gray-400"}`}>
                                        {formatMessageTime(m._creationTime)}
                                    </span>
                                </>
                            ) : m.fileUrl && m.fileType === "image" ? (
                                <div className="relative">
                                    <button onClick={() => onOpenLightbox(m.fileUrl, m.senderName, false)} className="block rounded-lg overflow-hidden">
                                        <img src={m.fileUrl} alt="Photo" className="max-w-[260px] max-h-[340px] w-full rounded-lg object-cover hover:opacity-95 transition-opacity" />
                                    </button>
                                    <div className="px-1.5 pb-0.5">
                                        {m.content && <p className="mt-1.5 text-[13.5px] leading-snug">{m.content}</p>}
                                        <span className={`block text-right text-[10px] select-none leading-none mt-1 ${isMe ? "text-blue-200 dark:text-blue-300" : "text-gray-400 dark:text-gray-500"}`}>
                                            {formatMessageTime(m._creationTime)}
                                        </span>
                                    </div>
                                </div>
                            ) : m.fileUrl && m.fileType === "video" ? (
                                <div className="relative">
                                    <video src={m.fileUrl} controls className="max-w-[280px] rounded-lg" style={{ maxHeight: 340 }} />
                                    <div className="px-1.5 pb-0.5">
                                        {m.content && <p className="mt-1.5 text-[13.5px] leading-snug">{m.content}</p>}
                                        <span className={`block text-right text-[10px] select-none leading-none mt-1 ${isMe ? "text-blue-200 dark:text-blue-300" : "text-gray-400 dark:text-gray-500"}`}>
                                            {formatMessageTime(m._creationTime)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="flex flex-wrap items-end gap-x-2">
                                    <span className="whitespace-pre-wrap leading-snug">{m.content}</span>
                                    <span className={`text-[10px] select-none leading-none ml-auto mt-0.5 flex-shrink-0 self-end ${isMe ? "text-blue-400" : "text-gray-400"}`}>
                                        {formatMessageTime(m._creationTime)}
                                    </span>
                                </span>
                            )}

                            {/* Bubble tail */}
                            {!isSameAsPrev && (
                                <span
                                    className={`absolute bottom-0 ${isMe ? "-right-1.5 text-blue-300 dark:text-[#18263A]" : "-left-1.5 text-white dark:text-[#202C33]"}`}
                                    style={{ fontSize: 0, lineHeight: 0 }}
                                >
                                    {isMe
                                        ? <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M0 8 L8 0 L8 8 Z" /></svg>
                                        : <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M8 8 L0 0 L0 8 Z" /></svg>
                                    }
                                </span>
                            )}

                            {/* Hover chevron + dropdown */}
                            {!m.isDeleted && !isSelecting && (
                                <div className="absolute top-0 right-0">
                                    <div className={`absolute top-0 right-0 w-14 h-10 rounded-tr-2xl pointer-events-none opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 ${isMe ? "bg-gradient-to-bl from-blue-100/90 dark:from-blue-600/90 to-transparent" : "bg-gradient-to-bl from-white/90 dark:from-gray-800/90 to-transparent"}`} />
                                    <button
                                        onClick={e => { e.stopPropagation(); onSetDropdown(openDropdownId === m._id ? null : m._id); }}
                                        className={`relative z-10 p-2 opacity-0 group-hover/msg:opacity-100 transition-opacity rounded-sm ${isMe ? "text-blue-400 hover:text-blue-700 dark:text-blue-200 dark:hover:text-white" : "text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"}`}
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    {openDropdownId === m._id && (
                                        <div className="absolute top-5 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-1 min-w-[120px] right-0" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => { onReply(m); onSetDropdown(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <CornerUpLeft className="w-3.5 h-3.5 text-blue-500" /> Reply
                                            </button>
                                            <button onClick={() => { onSelect(m._id); onSetDropdown(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <MousePointer2 className="w-3.5 h-3.5 text-indigo-500" /> Select
                                            </button>
                                            {isMe && (
                                                <button onClick={() => { onDelete(m._id); onSetDropdown(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Condensed reactions pill ── */}
                        {reactions.length > 0 && (
                            <div className="relative mt-0.5 mb-1 self-start">
                                <button
                                    onClick={e => { e.stopPropagation(); setReactionPopupOpen(true); }}
                                    className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5 shadow-sm hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer"
                                >
                                    {visibleReactions.map((r: any) => (
                                        <span key={r.emoji} className="text-[13px] leading-none">{r.emoji}</span>
                                    ))}
                                    {hiddenCount > 0 && (
                                        <span className="text-[10px] font-semibold text-gray-500 ml-0.5">+{hiddenCount}</span>
                                    )}
                                    {totalReactionCount > 1 && (
                                        <span className="text-[10px] font-medium text-gray-400 ml-0.5">{totalReactionCount}</span>
                                    )}
                                </button>

                                {/* Reaction detail popup */}
                                {reactionPopupOpen && (
                                    <div
                                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
                                        onClick={() => setReactionPopupOpen(false)}
                                    >
                                        <div
                                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-72 max-h-[420px] flex flex-col overflow-hidden"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                                <span className="font-semibold text-[14px] text-gray-700 dark:text-gray-200">Reactions</span>
                                                <button onClick={() => setReactionPopupOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 cursor-pointer">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="overflow-y-auto flex-1 divide-y divide-gray-50 dark:divide-gray-800/50">
                                                {reactions.map((r: any) => (
                                                    <div key={r.emoji} className="px-4 py-3 flex items-start gap-4">
                                                        <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 min-w-[48px]">
                                                            <span className="text-xl leading-none mb-1">{r.emoji}</span>
                                                            <span className="text-[11px] font-bold text-gray-500">{r.count}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-2 flex-1 pt-0.5 items-end justify-center">
                                                            {(r.users ?? []).length === 0 ? (
                                                                <span className="text-[12px] text-gray-400 italic">Unknown</span>
                                                            ) : (r.users ?? []).map((u: any, i: number) => (
                                                                <div key={i} className="flex items-center gap-2">
                                                                    {u.image
                                                                        ? <img src={u.image} alt={u.isMe ? "You" : u.name} className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                                                                        : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold flex-shrink-0">
                                                                            {(u.isMe ? "Y" : u.name?.charAt(0)) ?? "?"}
                                                                        </div>
                                                                    }
                                                                    <span className="text-[13px] text-gray-700 dark:text-gray-300 font-medium">
                                                                        {u.isMe ? "You" : u.name}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Floating emoji picker (desktop hover) */}
                    {!m.isDeleted && !isSelecting && (
                        <div className="flex items-end self-stretch flex-shrink-0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 pb-1">
                            <div className="relative group/react hidden sm:block h-full flex items-end">
                                <button className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-yellow-500 hover:border-yellow-300 dark:hover:border-yellow-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500/30">
                                    <Smile className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-xl rounded-full border border-gray-100 dark:border-gray-700 px-2 py-1.5 flex gap-1.5 opacity-0 invisible group-hover/react:opacity-100 group-hover/react:visible transition-all z-50 whitespace-nowrap">
                                    {REACTION_EMOJIS.map(emoji => (
                                        <button key={emoji} onClick={() => onReact(m._id, emoji)} className="hover:scale-125 transition-transform text-base leading-none">
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
