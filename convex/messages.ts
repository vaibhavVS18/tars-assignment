import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── File Storage ──────────────────────────────────────────────────────────────
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        return await ctx.storage.generateUploadUrl();
    },
});

export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        replyToId: v.optional(v.id("messages")),
        fileId: v.optional(v.id("_storage")),
        fileType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        const membership = await ctx.db
            .query("members")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", user._id)
            )
            .unique();

        if (!membership) throw new Error("Not a member of this conversation");

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: user._id,
            content: args.content,
            replyToId: args.replyToId,
            fileId: args.fileId,
            fileType: args.fileType,
        });

        await ctx.db.patch(args.conversationId, {
            lastMessageId: messageId,
        });

        return messageId;
    },
});

export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        return await Promise.all(
            messages.map(async (message) => {
                const sender = await ctx.db.get(message.senderId);

                // Reactions
                const reactions = await ctx.db
                    .query("reactions")
                    .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
                    .collect();

                const reactionMap: Record<string, { count: number; hasReacted: boolean; users: { name: string; image?: string; isMe: boolean }[] }> = {};
                for (const r of reactions) {
                    if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, hasReacted: false, users: [] };
                    reactionMap[r.emoji].count++;
                    const isCurrentUser = currentUser ? r.userId === currentUser._id : false;
                    if (isCurrentUser) reactionMap[r.emoji].hasReacted = true;
                    const reactor = await ctx.db.get(r.userId);
                    if (reactor) reactionMap[r.emoji].users.push({
                        name: reactor.name ?? "Unknown",
                        image: reactor.image,
                        isMe: isCurrentUser,
                    });
                }
                const formattedReactions = Object.entries(reactionMap).map(([emoji, data]) => ({
                    emoji, count: data.count, hasReacted: data.hasReacted, users: data.users,
                }));

                // Quoted reply
                let replyTo = null;
                if (message.replyToId) {
                    const quotedMsg = await ctx.db.get(message.replyToId);
                    if (quotedMsg) {
                        const quotedSender = await ctx.db.get(quotedMsg.senderId);
                        let quotedFileUrl: string | null = null;
                        if (quotedMsg.fileId) {
                            quotedFileUrl = await ctx.storage.getUrl(quotedMsg.fileId);
                        }
                        replyTo = {
                            id: quotedMsg._id,
                            content: quotedMsg.isDeleted ? "This message was deleted" : quotedMsg.content,
                            senderName: quotedSender?.name ?? "Unknown",
                            isDeleted: quotedMsg.isDeleted ?? false,
                            fileType: quotedMsg.fileType ?? null,
                            fileUrl: quotedFileUrl,
                        };
                    }
                }

                // Resolve file URL from Convex storage
                let fileUrl: string | null = null;
                if (message.fileId) {
                    fileUrl = await ctx.storage.getUrl(message.fileId);
                }

                return {
                    ...message,
                    senderName: sender?.name ?? "Unknown",
                    senderImage: sender?.image,
                    isMe: currentUser ? message.senderId === currentUser._id : false,
                    reactions: formattedReactions,
                    replyTo,
                    fileUrl,
                };
            })
        );
    },
});

export const deleteMessage = mutation({
    args: { messageId: v.id("messages") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!user) throw new Error("User not found");
        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");
        if (message.senderId !== user._id) throw new Error("Can only delete your own messages");
        await ctx.db.patch(args.messageId, { content: "This message was deleted", isDeleted: true });
    }
});

// Bulk soft-delete — only deletes messages owned by the caller
export const deleteMessages = mutation({
    args: { messageIds: v.array(v.id("messages")) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!user) throw new Error("User not found");
        for (const messageId of args.messageIds) {
            const message = await ctx.db.get(messageId);
            if (message && message.senderId === user._id && !message.isDeleted) {
                await ctx.db.patch(messageId, { content: "This message was deleted", isDeleted: true });
            }
        }
    }
});

export const toggleReaction = mutation({
    args: { messageId: v.id("messages"), emoji: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!user) throw new Error("User not found");
        // Check if the user already has any reaction on this message
        const existingReactions = await ctx.db
            .query("reactions")
            .withIndex("by_messageId_userId", (q) =>
                q.eq("messageId", args.messageId).eq("userId", user._id)
            )
            .collect();

        if (existingReactions.length > 0) {
            // Find if they reacted with the exact same emoji
            const sameEmojiReaction = existingReactions.find(r => r.emoji === args.emoji);

            // Regardless, remove all their existing reactions on this message
            for (const r of existingReactions) {
                await ctx.db.delete(r._id);
            }

            // If they clicked the same emoji, we just deleted it (toggled off). We don't add it back.
            // If they clicked a DIFFERENT emoji, we now add the new one.
            if (!sameEmojiReaction) {
                await ctx.db.insert("reactions", {
                    messageId: args.messageId,
                    userId: user._id,
                    emoji: args.emoji,
                });
            }
        } else {
            // They had no reactions, so just add the new one
            await ctx.db.insert("reactions", {
                messageId: args.messageId,
                userId: user._id,
                emoji: args.emoji,
            });
        }
    }
});
