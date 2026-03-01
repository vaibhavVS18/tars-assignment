"use client";

import { CornerUpLeft, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { REACTION_EMOJIS } from "./utils";

interface CtxMenuPosition {
    x: number;
    y: number;
    message: any;
}

interface ContextMenuProps {
    ctxMenu: CtxMenuPosition;
    onReply: (msg: any) => void;
    onReact: (messageId: Id<"messages">, emoji: string) => void;
    onDelete: (messageId: Id<"messages">) => void;
}

export default function ContextMenu({ ctxMenu, onReply, onReact, onDelete }: ContextMenuProps) {
    return (
        <div
            className="fixed z-[200] bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 min-w-[160px] overflow-hidden"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={e => e.stopPropagation()}
        >
            <button
                onClick={() => onReply(ctxMenu.message)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
                <CornerUpLeft className="w-4 h-4 text-blue-500" /> Reply
            </button>

            {!ctxMenu.message.isDeleted && (
                <div className="px-2 py-1">
                    <div className="flex gap-1.5 justify-around">
                        {REACTION_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => onReact(ctxMenu.message._id, emoji)}
                                className="text-base hover:scale-125 transition-transform"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {ctxMenu.message.isMe && !ctxMenu.message.isDeleted && (
                <>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                        onClick={() => onDelete(ctxMenu.message._id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </>
            )}
        </div>
    );
}
