"use client";

import { Smile, CornerUpLeft, X } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { REACTION_EMOJIS } from "./utils";

const ALL_EMOJIS = [
    "😀", "😂", "🥰", "😍", "😎", "🤔", "😢", "😡", "🤯", "🥳",
    "👍", "👎", "❤️", "🔥", "✨", "🎉", "💯", "🙏", "👀", "💪",
    "😅", "🤣", "😊", "😇", "🤩", "😴", "🫡", "🤝", "💀", "👻",
    "🐶", "🐱", "🌸", "⭐", "🌈", "🍕", "☕", "🎮", "🏆", "🚀",
];

interface ReplyingTo {
    id: Id<"messages">;
    content: string;
    senderName: string;
}

interface MessageInputProps {
    newMessage: string;
    replyingTo: ReplyingTo | null;
    showEmojiPicker: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onToggleEmoji: () => void;
    onInsertEmoji: (emoji: string) => void;
    onCancelReply: () => void;
    onInputFocus: () => void;
}

export default function MessageInput({
    newMessage, replyingTo, showEmojiPicker, inputRef,
    onChange, onSubmit, onToggleEmoji, onInsertEmoji, onCancelReply, onInputFocus,
}: MessageInputProps) {
    return (
        <>
            {/* Emoji picker panel */}
            {showEmojiPicker && (
                <div className="flex-shrink-0 bg-white border-t border-gray-100 shadow-inner px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add to message</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ALL_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onInsertEmoji(emoji)}
                                className="text-xl hover:bg-gray-100 rounded-lg p-1 transition-colors leading-none"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Reply preview bar */}
            {replyingTo && (
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-50 border-t border-blue-100">
                    <CornerUpLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-blue-600 mb-0.5">{replyingTo.senderName}</p>
                        <p className="text-xs text-gray-600 truncate">{replyingTo.content}</p>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/60"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input bar */}
            <div className="px-3 py-2.5 bg-white border-t border-gray-100 flex-shrink-0 w-full z-10">
                <form onSubmit={onSubmit} className="max-w-3xl mx-auto w-full flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onToggleEmoji}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker
                            ? "bg-yellow-100 text-yellow-500"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"}`}
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[14.5px] placeholder-gray-400"
                        placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : "Type a message..."}
                        value={newMessage}
                        onChange={onChange}
                        onFocus={onInputFocus}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </>
    );
}
