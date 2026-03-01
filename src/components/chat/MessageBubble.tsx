"use client";

import { Check, ChevronDown, CornerUpLeft, Smile, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { REACTION_EMOJIS, formatMessageTime } from "./utils";

interface MessageBubbleProps {
    message: any;
    isMe: boolean;
    isGroup: boolean;
    isSelecting: boolean;
    isSelected: boolean;
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
    onOpenLightbox: (src: string, name: string) => void;
    onTouchStart: (e: React.TouchEvent, msg: any) => void;
    onTouchMove: (e: React.TouchEvent, msg: any, el: HTMLDivElement) => void;
    onTouchEnd: (e: React.TouchEvent, msg: any) => void;
}

export default function MessageBubble({
    message: m, isMe, isGroup, isSelecting, isSelected,
    isSameAsPrev, isSameAsNext, showDateDivider, openDropdownId,
    onReply, onDelete, onReact, onSelect, onSetDropdown,
    onContextMenu, onOpenLightbox, onTouchStart, onTouchMove, onTouchEnd,
}: MessageBubbleProps) {
    // Bubble border-radius — tighter corners for consecutive messages from same sender
    const bubbleRadius = isMe
        ? `rounded-2xl ${isSameAsPrev ? "rounded-tr-md" : ""} ${isSameAsNext ? "rounded-br-sm" : ""}`
        : `rounded-2xl ${isSameAsPrev ? "rounded-tl-md" : ""} ${isSameAsNext ? "rounded-bl-sm" : ""}`;

    return (
        <div key={m._id}>
            {/* ── Date divider ── */}
            {showDateDivider && (
                <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 font-medium bg-slate-50 px-2">
                        {new Date(m._creationTime).toDateString() === new Date().toDateString()
                            ? "Today"
                            : new Date(m._creationTime).getFullYear() !== new Date().getFullYear()
                                ? new Date(m._creationTime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                                : new Date(m._creationTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>
            )}

            {/* ── Message row ── */}
            <div
                className={`flex items-end gap-2 w-full ${isSameAsPrev ? "mt-0.5" : "mt-3"} ${isMe ? "flex-row-reverse" : "flex-row"} ${isSelected ? (isMe ? "bg-blue-50/60" : "bg-gray-100/60") : ""} rounded-xl transition-colors`}
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
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 self-center flex items-center justify-center transition-colors ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"}`}
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
                        className={`bubble-wrap flex flex-col max-w-[72%] sm:max-w-[60%] ${isMe ? "items-end" : "items-start"}`}
                        onClick={() => isSelecting && onSelect(m._id)}
                    >
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
                                <span className="text-[11px] font-bold text-indigo-500 leading-none">{m.senderName}</span>
                            </div>
                        )}

                        {/* Reply-to quoted block */}
                        {m.replyTo && (
                            <div
                                className="mb-1.5 px-3 py-2 rounded-lg border-l-[3px] max-w-full cursor-pointer bg-white/95 border-blue-500 shadow-sm hover:bg-white transition-colors"
                                onClick={() => {
                                    const el = document.getElementById(`msg-${m.replyTo.id}`);
                                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    el?.classList.add("ring-2", "ring-blue-400", "rounded-xl");
                                    setTimeout(() => el?.classList.remove("ring-2", "ring-blue-400", "rounded-xl"), 1500);
                                }}
                            >
                                <p className="text-[10px] font-bold mb-0.5 text-blue-600">{m.replyTo.senderName}</p>
                                <p className={`text-[12px] truncate text-gray-600 ${m.replyTo.isDeleted ? "italic opacity-70" : ""}`}>
                                    {m.replyTo.content}
                                </p>
                            </div>
                        )}

                        {/* Main bubble */}
                        <div
                            id={`msg-${m._id}`}
                            className={`relative px-3.5 pt-2 pb-2 text-[14px] leading-snug break-words shadow-sm w-fit transition-all ${bubbleRadius} ${isMe ? "bg-blue-600 text-white" : "bg-white text-gray-800 border border-gray-100"}`}
                        >
                            {m.isDeleted ? (
                                <>
                                    <span className={`italic text-[13px] ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                                        This message was deleted
                                    </span>
                                    <span className={`block text-right text-[10px] select-none leading-none mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                                        {formatMessageTime(m._creationTime)}
                                    </span>
                                </>
                            ) : (
                                <span className="flex flex-wrap items-end gap-x-2">
                                    <span className="whitespace-pre-wrap leading-snug">{m.content}</span>
                                    <span className={`text-[10px] select-none leading-none ml-auto mt-0.5 flex-shrink-0 self-end ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                                        {formatMessageTime(m._creationTime)}
                                    </span>
                                </span>
                            )}

                            {/* Bubble tail */}
                            {!isSameAsPrev && (
                                <span
                                    className={`absolute bottom-0 ${isMe ? "-right-1.5 text-blue-600" : "-left-1.5 text-white"}`}
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
                                    <div className={`absolute top-0 right-0 w-14 h-10 rounded-tr-2xl pointer-events-none opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 ${isMe ? "bg-gradient-to-bl from-blue-600/70 to-transparent" : "bg-gradient-to-bl from-white/90 to-transparent"}`} />
                                    <button
                                        onClick={e => { e.stopPropagation(); onSetDropdown(openDropdownId === m._id ? null : m._id); }}
                                        className={`relative z-10 p-2 opacity-0 group-hover/msg:opacity-100 transition-opacity rounded-sm ${isMe ? "text-blue-100 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    {openDropdownId === m._id && (
                                        <div
                                            className="absolute top-5 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[120px] right-0"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => { onReply(m); onSetDropdown(null); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <CornerUpLeft className="w-3.5 h-3.5 text-blue-500" /> Reply
                                            </button>
                                            {isMe && (
                                                <button
                                                    onClick={() => { onDelete(m._id); onSetDropdown(null); }}
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
                            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                {m.reactions.map((r: any) => (
                                    <button
                                        key={r.emoji}
                                        onClick={() => onReact(m._id, r.emoji)}
                                        className={`flex items-center gap-0.5 text-[12px] px-2 py-0.5 rounded-full border transition-all ${r.hasReacted ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold" : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"}`}
                                    >
                                        <span>{r.emoji}</span>
                                        <span className="text-[10px] font-medium">{r.count}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Floating emoji picker (desktop hover) */}
                    {!m.isDeleted && !isSelecting && (
                        <div className="flex items-center self-center flex-shrink-0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
                            <div className="relative group/react hidden sm:block">
                                <button className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-yellow-500 hover:border-yellow-300 shadow-sm transition-all">
                                    <Smile className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full border border-gray-100 px-2 py-1.5 flex gap-1.5 opacity-0 invisible group-hover/react:opacity-100 group-hover/react:visible transition-all z-50 whitespace-nowrap">
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
