"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { UserButton, useUser } from "@clerk/nextjs";
import { Search, MessageCircle, Users, Plus, X, Check } from "lucide-react";
import { useState } from "react";
import AvatarLightbox from "./AvatarLightbox";

export default function Sidebar({
    selectedConversationId,
    onSelectConversation,
}: {
    selectedConversationId: Id<"conversations"> | null;
    onSelectConversation: (id: Id<"conversations">) => void;
}) {
    const { user } = useUser();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"chats" | "people">("chats");
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedGroupMembers, setSelectedGroupMembers] = useState<Id<"users">[]>([]);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);

    const users = useQuery(api.users.getUsers, { searchTerm: searchTerm || undefined });
    const conversations = useQuery(api.conversations.getMyConversations);
    const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);
    const createGroup = useMutation(api.conversations.createGroup);

    const startConversation = async (otherUserId: Id<"users">) => {
        try {
            const convId = await getOrCreateConversation({ otherUserId });
            if (convId) {
                onSelectConversation(convId);
                setSearchTerm("");
                setActiveTab("chats");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleGroupMember = (userId: Id<"users">) => {
        setSelectedGroupMembers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedGroupMembers.length === 0) return;
        setIsCreatingGroup(true);
        try {
            const convId = await createGroup({ name: groupName.trim(), memberIds: selectedGroupMembers });
            onSelectConversation(convId);
            setShowGroupModal(false);
            setGroupName("");
            setSelectedGroupMembers([]);
            setActiveTab("chats");
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const filteredConversations = conversations?.filter(c => {
        if (!searchTerm) return true;
        const name = c.isGroup ? c.groupName : c.otherUser?.name;
        return name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (d.getFullYear() !== now.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full bg-white w-full">
            {/* Avatar Lightbox */}
            {lightbox && (
                <AvatarLightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)} />
            )}

            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-gray-800 truncate">{user?.fullName ?? user?.firstName ?? 'User'}</h2>
                        <p className="text-xs text-green-500 font-medium">Online</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowGroupModal(true)}
                    title="Create group chat"
                    className="flex-shrink-0 p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 border-b border-gray-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-full bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-2 pt-1">
                {(['chats', 'people'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-t-lg capitalize transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab === 'chats' ? <><MessageCircle className="w-3.5 h-3.5 inline mr-1.5" />Chats</> : <><Users className="w-3.5 h-3.5 inline mr-1.5" />People</>}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-1">
                {activeTab === 'chats' ? (
                    /* CONVERSATIONS TAB */
                    filteredConversations === undefined ? (
                        <div className="space-y-2 p-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse flex items-center p-2 gap-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-28" />
                                        <div className="h-2.5 bg-gray-100 rounded w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="py-12 text-center px-6">
                            <div className="mx-auto w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <MessageCircle className="w-7 h-7 text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">
                                {searchTerm ? "No conversations found" : "No conversations yet"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {searchTerm ? "Try a different name" : "Go to People tab to start chatting."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0.5 px-2 py-1">
                            {(filteredConversations as any[]).map((c: any) => {
                                const isActive = selectedConversationId === c._id;
                                const displayName = c.isGroup ? c.groupName : (c.otherUser?.name ?? "Unknown User");
                                const displayImage = c.isGroup ? null : c.otherUser?.image;
                                const isOnline = !c.isGroup && c.otherUser?.isOnline;
                                const hasUnread = c.unreadCount > 0;
                                const memberCount = c.isGroup && c.memberCount ? c.memberCount : null;

                                return (
                                    <button
                                        key={c._id}
                                        onClick={() => onSelectConversation(c._id)}
                                        className={`w-full text-left flex items-start p-2.5 rounded-xl transition-all ${isActive ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-gray-50"}`}
                                    >
                                        <div className="relative flex-shrink-0 mt-0.5">
                                            {displayImage ? (
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => { e.stopPropagation(); setLightbox({ src: displayImage, name: displayName }); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setLightbox({ src: displayImage, name: displayName }); } }}
                                                    title={`View ${displayName}'s photo`}
                                                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
                                                >
                                                    <img src={displayImage} alt={displayName} className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-100 hover:opacity-90 transition-opacity" />
                                                </div>
                                            ) : (
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border ${c.isGroup ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 border-purple-50' : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border-blue-50'}`}>
                                                    {c.isGroup ? <Users className="w-5 h-5" /> : (displayName?.charAt(0) ?? "U")}
                                                </div>
                                            )}
                                            {isOnline && (
                                                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className={`text-sm truncate pr-1 ${hasUnread ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>{displayName}</p>
                                                {c.lastMessage && (
                                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-1">
                                                        {formatTime(c.lastMessage._creationTime)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs truncate flex-1 pr-1 ${hasUnread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                                                    {c.lastMessage ? (
                                                        c.lastMessage.isDeleted ? <span className="italic text-gray-400">Message deleted</span> : c.lastMessage.content
                                                    ) : (
                                                        c.isGroup ? `${memberCount ?? ''} members` : "Start chatting!"
                                                    )}
                                                </p>
                                                {hasUnread && (
                                                    <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                                                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )
                ) : (
                    /* PEOPLE TAB */
                    users === undefined ? (
                        <div className="space-y-2 p-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse flex items-center p-2 gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-24" />
                                        <div className="h-2.5 bg-gray-100 rounded w-40" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-12 text-center px-6">
                            <div className="mx-auto w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <Users className="w-7 h-7 text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">
                                {searchTerm ? "No users found" : "No other users yet"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {searchTerm ? "Try a different name" : "Share the app link to invite others!"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0.5 px-2 py-1">
                            {(users as any[]).map((u: any) => (
                                <button
                                    key={u._id}
                                    onClick={() => startConversation(u._id)}
                                    className="w-full text-left flex items-center p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="relative flex-shrink-0">
                                        {u.image ? (
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); setLightbox({ src: u.image, name: u.name }); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setLightbox({ src: u.image, name: u.name }); } }}
                                                title={`View ${u.name}'s photo`}
                                                className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
                                            >
                                                <img src={u.image} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 hover:opacity-90 transition-opacity" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                                {u.name?.charAt(0) ?? "U"}
                                            </div>
                                        )}
                                        {u.isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                        )}
                                    </div>
                                    <div className="ml-3 flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                                        <p className={`text-xs font-medium ${u.isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                                            {u.isOnline ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                    <MessageCircle className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2" />
                                </button>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Group Creation Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-800">New Group Chat</h3>
                            <button onClick={() => { setShowGroupModal(false); setSelectedGroupMembers([]); setGroupName(""); }} className="p-1 rounded-full hover:bg-gray-100">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Group Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Study Group, Team Syncs..."
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                    Add Members ({selectedGroupMembers.length} selected)
                                </label>
                                <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-1">
                                    {users === undefined ? (
                                        <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
                                    ) : users.length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-4">No other users available</p>
                                    ) : (
                                        (users as any[]).map((u: any) => {
                                            const isSelected = selectedGroupMembers.includes(u._id);
                                            return (
                                                <button
                                                    key={u._id}
                                                    onClick={() => toggleGroupMember(u._id)}
                                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                                >
                                                    <div className="relative flex-shrink-0">
                                                        {u.image ? (
                                                            <img src={u.image} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                                {u.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-800 flex-1 truncate">{u.name}</span>
                                                    {isSelected && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={handleCreateGroup}
                                disabled={!groupName.trim() || selectedGroupMembers.length === 0 || isCreatingGroup}
                                className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreatingGroup ? "Creating..." : `Create Group (${selectedGroupMembers.length} members)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
