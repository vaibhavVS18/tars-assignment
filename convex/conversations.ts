import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateConversation = mutation({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!currentUser) throw new Error("User not found");

        if (currentUser._id === args.otherUserId) {
            throw new Error("Cannot message yourself");
        }

        const myMemberships = await ctx.db
            .query("members")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        const otherUserMemberships = await ctx.db
            .query("members")
            .withIndex("by_userId", (q) => q.eq("userId", args.otherUserId))
            .collect();

        const myConversationIds = myMemberships.map((m) => m.conversationId);
        const otherUserConversationIds = otherUserMemberships.map((m) => m.conversationId);

        const commonConversationIds = myConversationIds.filter((id) =>
            otherUserConversationIds.includes(id)
        );

        for (const convId of commonConversationIds) {
            const conv = await ctx.db.get(convId);
            if (conv && !conv.isGroup) {
                return conv._id;
            }
        }

        const newConversationId = await ctx.db.insert("conversations", {
            isGroup: false,
        });

        await ctx.db.insert("members", {
            userId: currentUser._id,
            conversationId: newConversationId,
        });

        await ctx.db.insert("members", {
            userId: args.otherUserId,
            conversationId: newConversationId,
        });

        return newConversationId;
    },
});

export const getMyConversations = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!currentUser) return [];

        const memberships = await ctx.db
            .query("members")
            .withIndex("by_userId", (q) => q.eq("userId", currentUser._id))
            .collect();

        const conversationsWithDetails = await Promise.all(
            memberships.map(async (membership) => {
                const conversation = await ctx.db.get(membership.conversationId);
                if (!conversation) return null;

                // Get all members of this conversation
                const allConvMembers = await ctx.db
                    .query("members")
                    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation._id))
                    .collect();

                let otherUser = null;
                let groupMembers: any[] = [];

                if (!conversation.isGroup) {
                    const otherMember = allConvMembers.find((m) => m.userId !== currentUser._id);
                    if (otherMember) {
                        otherUser = await ctx.db.get(otherMember.userId);
                    }
                } else {
                    // For groups, get all member details including admin status
                    groupMembers = (await Promise.all(
                        allConvMembers.map(async (m) => {
                            const u = await ctx.db.get(m.userId);
                            return u ? { _id: u._id, name: u.name, image: u.image, isOnline: u.isOnline, isAdmin: m.isAdmin ?? false, memberId: m._id } : null;
                        })
                    )).filter(Boolean);
                }

                let lastMessage = null;
                if (conversation.lastMessageId) {
                    lastMessage = await ctx.db.get(conversation.lastMessageId);
                }

                const allMessages = await ctx.db
                    .query("messages")
                    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation._id))
                    .filter((q) => q.neq(q.field("senderId"), currentUser._id))
                    .collect();

                const unreadCount = allMessages.filter(m => !m.readBy?.includes(currentUser._id)).length;

                return {
                    ...conversation,
                    otherUser,
                    groupMembers,
                    memberCount: allConvMembers.length,
                    lastMessage,
                    unreadCount
                };
            })
        );

        return conversationsWithDetails
            .filter((c) => c !== null)
            .sort((a, b) => {
                const timeA = a!.lastMessage?._creationTime ?? a!._creationTime;
                const timeB = b!.lastMessage?._creationTime ?? b!._creationTime;
                return timeB - timeA;
            });
    },
});

// Helper: get current user or throw
async function getCurrentUser(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
    if (!user) throw new Error("User not found");
    return user;
}

// Helper: assert caller is an admin of the group
async function assertAdmin(ctx: any, conversationId: string, userId: string) {
    const membership = await ctx.db
        .query("members")
        .withIndex("by_conversationId_userId", (q: any) =>
            q.eq("conversationId", conversationId).eq("userId", userId)
        )
        .unique();
    if (!membership || !membership.isAdmin) throw new Error("Forbidden: admin only");
    return membership;
}

export const markAsRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return;

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .filter((q) => q.neq(q.field("senderId"), user._id))
            .collect();

        for (const msg of messages) {
            if (!msg.readBy?.includes(user._id)) {
                const newReadBy = [...(msg.readBy ?? []), user._id];
                await ctx.db.patch(msg._id, { readBy: newReadBy });
            }
        }
    }
});

export const createGroup = mutation({
    args: {
        name: v.string(),
        memberIds: v.array(v.id("users"))
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const newConversationId = await ctx.db.insert("conversations", {
            isGroup: true,
            groupName: args.name,
        });

        const allMemberIds = [...new Set([...args.memberIds, currentUser._id])];

        for (const memberId of allMemberIds) {
            await ctx.db.insert("members", {
                userId: memberId,
                conversationId: newConversationId,
                // Creator is admin; others are not
                isAdmin: memberId === currentUser._id ? true : undefined,
            });
        }

        return newConversationId;
    }
});

// ── Group Admin Mutations ──────────────────────────────────────────────────

export const renameGroup = mutation({
    args: { conversationId: v.id("conversations"), name: v.string() },
    handler: async (ctx, args) => {
        const me = await getCurrentUser(ctx);
        await assertAdmin(ctx, args.conversationId, me._id);
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Not a group");
        await ctx.db.patch(args.conversationId, { groupName: args.name.trim() });
    },
});

export const addGroupMember = mutation({
    args: { conversationId: v.id("conversations"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const me = await getCurrentUser(ctx);
        await assertAdmin(ctx, args.conversationId, me._id);
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Not a group");
        // Check if already a member
        const existing = await ctx.db
            .query("members")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", args.userId)
            )
            .unique();
        if (existing) throw new Error("User is already a member");
        await ctx.db.insert("members", {
            userId: args.userId,
            conversationId: args.conversationId,
        });
    },
});

export const removeGroupMember = mutation({
    args: { conversationId: v.id("conversations"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const me = await getCurrentUser(ctx);
        await assertAdmin(ctx, args.conversationId, me._id);
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || !conversation.isGroup) throw new Error("Not a group");
        // Find membership to delete
        const membership = await ctx.db
            .query("members")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", args.userId)
            )
            .unique();
        if (!membership) throw new Error("User is not a member");
        // Prevent removing the last admin
        if (membership.isAdmin) {
            const allMembers = await ctx.db
                .query("members")
                .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
                .collect();
            const adminCount = allMembers.filter((m) => m.isAdmin).length;
            if (adminCount <= 1) throw new Error("Cannot remove the last admin");
        }
        await ctx.db.delete(membership._id);
    },
});

export const promoteToAdmin = mutation({
    args: { conversationId: v.id("conversations"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const me = await getCurrentUser(ctx);
        await assertAdmin(ctx, args.conversationId, me._id);
        const membership = await ctx.db
            .query("members")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", args.userId)
            )
            .unique();
        if (!membership) throw new Error("User is not a member");
        await ctx.db.patch(membership._id, { isAdmin: true });
    },
});

export const demoteAdmin = mutation({
    args: { conversationId: v.id("conversations"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const me = await getCurrentUser(ctx);
        await assertAdmin(ctx, args.conversationId, me._id);
        const allMembers = await ctx.db
            .query("members")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();
        const adminCount = allMembers.filter((m) => m.isAdmin).length;
        if (adminCount <= 1) throw new Error("Cannot remove the last admin");
        const membership = allMembers.find((m) => m.userId === args.userId);
        if (!membership) throw new Error("User is not a member");
        await ctx.db.patch(membership._id, { isAdmin: false });
    },
});

export const getGroupDetails = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!currentUser) return null;
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || !conversation.isGroup) return null;
        const allMembers = await ctx.db
            .query("members")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        const hasAnyAdmin = allMembers.some((m) => m.isAdmin);

        // For legacy groups with no admin: treat the earliest joined member as admin
        const oldestMember = allMembers.reduce((a, b) =>
            a._creationTime < b._creationTime ? a : b
        );
        const effectiveAdminId = hasAnyAdmin ? null : oldestMember.userId;

        const myMembership = allMembers.find((m) => m.userId === currentUser._id);
        const amIAdmin = hasAnyAdmin
            ? (myMembership?.isAdmin ?? false)
            : currentUser._id === effectiveAdminId;

        const members = (await Promise.all(
            allMembers.map(async (m) => {
                const u = await ctx.db.get(m.userId);
                const isAdmin = hasAnyAdmin
                    ? (m.isAdmin ?? false)
                    : m.userId === effectiveAdminId;
                return u ? { _id: u._id, name: u.name, image: u.image, isOnline: u.isOnline, isAdmin } : null;
            })
        )).filter(Boolean);

        return {
            groupName: conversation.groupName,
            amIAdmin,
            members,
            needsAdminClaim: !hasAnyAdmin,
        };
    },
});

// Persists admin status for legacy groups that have no admin yet.
// Should be called once by the effective admin when they first open the group.
export const claimAdmin = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const me = await getCurrentUser(ctx);
        const allMembers = await ctx.db
            .query("members")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();
        // Abort if someone already has admin
        const hasAnyAdmin = allMembers.some((m) => m.isAdmin);
        if (hasAnyAdmin) return;
        // Only the earliest member can claim
        const oldest = allMembers.reduce((a, b) => a._creationTime < b._creationTime ? a : b);
        if (oldest.userId !== me._id) throw new Error("Only the group creator can claim admin for legacy groups");
        await ctx.db.patch(oldest._id, { isAdmin: true });
    },
});

