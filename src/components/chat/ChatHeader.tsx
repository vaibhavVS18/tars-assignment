"use client";

import { ArrowLeft, Trash2, Users, X } from "lucide-react";

interface ChatHeaderProps {
    isSelecting: boolean;
    selectedCount: number;
    onBack: () => void;
    onBulkDelete: () => void;
    onClearSelect: () => void;
    conversationName: string;
    isGroup: boolean;
    otherUserOnline: boolean;
    typingUsers: any[];
    groupMembers: any[];
    conversationImage: string | null;
    onToggleMembersPanel: () => void;
    onOpenLightbox: (src: string, name: string) => void;
}

export default function ChatHeader({
    isSelecting, selectedCount, onBack, onBulkDelete, onClearSelect,
    conversationName, isGroup, otherUserOnline, typingUsers,
    groupMembers, conversationImage, onToggleMembersPanel, onOpenLightbox,
}: ChatHeaderProps) {
    // ── Multi-select mode header ──
    if (isSelecting) {
        return (
            <div className="px-4 py-3 bg-blue-600 flex items-center gap-3 shadow-sm z-10 flex-shrink-0 min-h-[64px]">
                <button onClick={onClearSelect} className="p-1.5 text-white/80 hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5" />
                </button>
                <span className="flex-1 text-white font-bold text-sm">{selectedCount} selected</span>
                <button
                    onClick={onBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> Delete
                </button>
            </div>
        );
    }

    // Normal header 
    return (
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center shadow-sm z-10 flex-shrink-0 min-h-[64px]">
            <button
                onClick={onBack}
                className="mr-2 p-1.5 md:hidden text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center flex-1 overflow-hidden gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    {conversationImage ? (
                        <button onClick={() => onOpenLightbox(conversationImage, conversationName)} className="rounded-full">
                            <img
                                src={conversationImage} alt={conversationName}
                                className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm hover:opacity-90 cursor-pointer"
                            />
                        </button>
                    ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm ${isGroup
                            ? "bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 border-purple-50"
                            : "bg-gradient-to-br from-indigo-100 to-blue-100 text-blue-700 border-blue-50"}`}
                        >
                            {isGroup ? <Users className="w-5 h-5" /> : conversationName.charAt(0)}
                        </div>
                    )}
                    {!isGroup && otherUserOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                </div>

                {/* Name + status */}
                <div className="min-w-0 flex-1">
                    <button
                        onClick={() => isGroup && onToggleMembersPanel()}
                        className={`text-sm font-bold text-gray-800 truncate leading-tight block max-w-full text-left ${isGroup ? "hover:text-blue-600 cursor-pointer" : "cursor-default"}`}
                    >
                        {conversationName}
                    </button>

                    {typingUsers.length > 0 ? (
                        <p className="text-xs text-blue-500 font-medium leading-tight animate-pulse truncate">
                            {typingUsers.map((u: any) => u.name?.split(" ")[0]).join(", ")} is typing...
                        </p>
                    ) : isGroup ? (
                        <button
                            onClick={onToggleMembersPanel}
                            className="text-xs text-gray-400 hover:text-blue-500 text-left truncate block max-w-full transition-colors"
                        >
                            {groupMembers.length > 0
                                ? `${groupMembers.length} members · ${groupMembers.filter((m: any) => m.isOnline).length} online`
                                : "Group chat"}
                        </button>
                    ) : (
                        <p className={`text-xs font-medium leading-tight ${otherUserOnline ? "text-green-500" : "text-gray-400"}`}>
                            {otherUserOnline ? "Active now" : "Offline"}
                        </p>
                    )}
                </div>

                {/* Stacked group avatars */}
                {isGroup && groupMembers.length > 0 && (
                    <div className="flex-shrink-0 flex items-center -space-x-2">
                        {groupMembers.slice(0, 4).map((m: any) => (
                            <div key={m._id} className="relative" title={m.name}>
                                {m.image
                                    ? <img src={m.image} alt={m.name} className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" />
                                    : <div className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">{m.name?.charAt(0)}</div>
                                }
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
    );
}
