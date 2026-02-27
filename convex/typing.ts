import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const setTyping = mutation({
    args: {
        conversationId: v.id("conversations"),
        isTyping: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return;

        const membership = await ctx.db
            .query("members")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", user._id)
            )
            .unique();

        if (!membership) return; // Must be a member to type

        const existingIndicator = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", user._id)
            )
            .unique();

        if (args.isTyping) {
            const expiresAt = Date.now() + 3000; // 3 seconds expiry
            if (existingIndicator) {
                await ctx.db.patch(existingIndicator._id, { expiresAt });
            } else {
                await ctx.db.insert("typingIndicators", {
                    conversationId: args.conversationId,
                    userId: user._id,
                    expiresAt,
                });
            }
        } else {
            if (existingIndicator) {
                await ctx.db.delete(existingIndicator._id);
            }
        }
    },
});

export const getTypingUsers = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return [];

        const now = Date.now();
        const typingIndicators = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .filter((q) => q.gt(q.field("expiresAt"), now))
            .collect();

        const typingUsers = [];
        for (const indicator of typingIndicators) {
            if (indicator.userId !== user._id) {
                const typingUser = await ctx.db.get(indicator.userId);
                if (typingUser) {
                    typingUsers.push(typingUser);
                }
            }
        }

        return typingUsers;
    }
});
