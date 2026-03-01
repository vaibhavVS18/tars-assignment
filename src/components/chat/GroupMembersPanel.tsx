"use client";

import { Check, Crown, Edit2, UserMinus, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";

interface Member {
    _id: Id<"users">;
    name?: string;
    image?: string;
    isOnline: boolean;
    isAdmin: boolean;
}

interface GroupMembersPanelProps {
    detailedMembers: Member[];
    iAmAdmin: boolean;
    nonMembers: any[];
    conversationName: string;
    adminError: string | null;
    onClose: () => void;
    onRename: (name: string) => Promise<void>;
    onAddMember: (userId: Id<"users">) => Promise<void>;
    onRemoveMember: (userId: Id<"users">) => Promise<void>;
    onPromote: (userId: Id<"users">) => Promise<void>;
    onDemote: (userId: Id<"users">) => Promise<void>;
    onClearError: () => void;
    onOpenLightbox: (src: string, name: string) => void;
}

export default function GroupMembersPanel({
    detailedMembers, iAmAdmin, nonMembers, conversationName,
    adminError, onClose, onRename, onAddMember, onRemoveMember,
    onPromote, onDemote, onClearError, onOpenLightbox,
}: GroupMembersPanelProps) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [showAddMember, setShowAddMember] = useState(false);

    const handleRename = async () => {
        if (!renameValue.trim()) return;
        await onRename(renameValue.trim());
        setIsRenaming(false);
    };

    return (
        <div className="flex-shrink-0 bg-white border-b border-gray-100 shadow-sm">
            <div className="px-4 py-3">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Members ({detailedMembers.length})
                    </h3>
                    <div className="flex items-center gap-2">
                        {iAmAdmin && (
                            <>
                                <button
                                    onClick={() => { setShowAddMember(p => !p); onClearError(); }}
                                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50"
                                >
                                    <UserPlus className="w-3.5 h-3.5" /> Add
                                </button>
                                <button
                                    onClick={() => { setIsRenaming(p => !p); setRenameValue(conversationName); onClearError(); }}
                                    className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 font-semibold px-2 py-1 rounded-lg hover:bg-purple-50"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Rename
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="text-[10px] text-gray-400 hover:text-gray-600">
                            Hide
                        </button>
                    </div>
                </div>

                {/* Error banner */}
                {adminError && (
                    <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                        <span className="text-[11px] text-red-600">{adminError}</span>
                        <button onClick={onClearError}><X className="w-3 h-3 text-red-400" /></button>
                    </div>
                )}

                {/* Rename input */}
                {isRenaming && (
                    <div className="mb-3 flex gap-2">
                        <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
                            placeholder="New group name..."
                            className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
                        />
                        <button onClick={handleRename} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button onClick={() => setIsRenaming(false)} className="px-2 py-1.5 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Add member list */}
                {showAddMember && (
                    <div className="mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Add People</p>
                        {nonMembers.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2 text-center">Everyone is already in this group</p>
                        ) : (
                            <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-1">
                                {nonMembers.map((u: any) => (
                                    <button
                                        key={u._id}
                                        onClick={() => onAddMember(u._id)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 text-left"
                                    >
                                        {u.image
                                            ? <img src={u.image} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                                            : <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">{u.name?.charAt(0)}</div>
                                        }
                                        <span className="text-xs font-medium text-gray-800 flex-1 truncate">{u.name}</span>
                                        <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Member list */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {detailedMembers.map((m) => (
                        <div key={m._id} className="flex items-center gap-2 px-1 py-1 rounded-lg group/member hover:bg-gray-50">
                            <div className="relative flex-shrink-0">
                                {m.image ? (
                                    <button onClick={() => onOpenLightbox(m.image!, m.name ?? "")} className="rounded-full">
                                        <img src={m.image} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-sm hover:opacity-90 cursor-pointer" />
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                        {m.name?.charAt(0)}
                                    </div>
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
                                <span className={`text-[10px] ${m.isOnline ? "text-green-500" : "text-gray-400"}`}>
                                    {m.isOnline ? "Online" : "Offline"}
                                </span>
                            </div>

                            {iAmAdmin && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                                    {m.isAdmin ? (
                                        <button onClick={() => onDemote(m._id)} title="Remove admin" className="p-1 rounded-full text-amber-400 hover:text-amber-600 hover:bg-amber-50">
                                            <Crown className="w-3.5 h-3.5" />
                                        </button>
                                    ) : (
                                        <button onClick={() => onPromote(m._id)} title="Make admin" className="p-1 rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50">
                                            <Crown className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => onRemoveMember(m._id)} title="Remove" className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50">
                                        <UserMinus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
