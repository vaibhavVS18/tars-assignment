"use client";

import { Image, Loader2, Smile, CornerUpLeft, X } from "lucide-react";
import { useRef, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { REACTION_EMOJIS } from "./utils";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
    conversationId: Id<"conversations">;
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
    onSendMedia: (fileId: Id<"_storage">, fileType: string) => Promise<void>;
}

export default function MessageInput({
    conversationId,
    newMessage, replyingTo, showEmojiPicker, inputRef,
    onChange, onSubmit, onToggleEmoji, onInsertEmoji, onCancelReply, onInputFocus,
    onSendMedia,
}: MessageInputProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; type: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size guard: 50 MB max
        if (file.size > 50 * 1024 * 1024) {
            setUploadError("File too large (max 50 MB)");
            return;
        }

        const fileType = file.type.startsWith("video/") ? "video" : "image";
        setUploadError(null);
        setPreviewFile({ url: URL.createObjectURL(file), type: fileType });
        setUploading(true);

        try {
            // 1. Get a pre-signed upload URL from Convex
            const uploadUrl = await generateUploadUrl();

            // 2. POST the file directly to Convex storage
            const response = await fetch(uploadUrl, {
                method: "POST",
                body: file,
                headers: { "Content-Type": file.type },
            });

            if (!response.ok) throw new Error("Upload failed");

            const { storageId } = await response.json();

            // 3. Send a message with the storage ID
            await onSendMedia(storageId as Id<"_storage">, fileType);
        } catch (err) {
            console.error(err);
            setUploadError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
            setPreviewFile(null);
            // Reset the input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <>
            {/* Emoji picker panel */}
            {showEmojiPicker && (
                <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-inner px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add to message</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ALL_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onInsertEmoji(emoji)}
                                className="text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-1 transition-colors leading-none"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload preview */}
            {previewFile && (
                <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    {previewFile.type === "image" ? (
                        <img src={previewFile.url} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                    ) : (
                        <video src={previewFile.url} className="w-24 h-16 rounded-xl object-cover border border-gray-200" />
                    )}
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {previewFile.type === "image" ? "📷 Photo" : "🎥 Video"}
                        </p>
                        {uploading && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                <span className="text-[11px] text-blue-500 font-medium">Uploading...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload error */}
            {uploadError && (
                <div className="flex-shrink-0 px-4 py-1.5 bg-red-50 dark:bg-red-900/30 border-t border-red-100 dark:border-red-900/50 flex items-center justify-between">
                    <span className="text-xs text-red-600">{uploadError}</span>
                    <button onClick={() => setUploadError(null)}><X className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
            )}

            {/* Reply preview bar */}
            {replyingTo && (
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/30">
                    <CornerUpLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-blue-600 mb-0.5">{replyingTo.senderName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{replyingTo.content}</p>
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
            <div className="px-3 py-2.5 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 w-full z-10">
                <form onSubmit={onSubmit} className="max-w-3xl mx-auto w-full flex items-center gap-2">
                    {/* Emoji toggle */}
                    <button
                        type="button"
                        onClick={onToggleEmoji}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker
                            ? "bg-yellow-100 text-yellow-500"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"}`}
                    >
                        <Smile className="w-5 h-5" />
                    </button>

                    {/* Media picker button */}
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-blue-500 disabled:opacity-40"
                        title="Send photo or video"
                    >
                        {uploading
                            ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                            : <Image className="w-5 h-5" />
                        }
                    </button>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Text input */}
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[14.5px] placeholder-gray-400 dark:text-gray-100"
                        placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : "Type a message..."}
                        value={newMessage}
                        onChange={onChange}
                        onFocus={onInputFocus}
                    />

                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || uploading}
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
