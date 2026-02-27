import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.string(),
        image: v.optional(v.string()),
        tokenIdentifier: v.string(),
        isOnline: v.boolean(),
    }).index("by_tokenIdentifier", ["tokenIdentifier"]),

    conversations: defineTable({
        isGroup: v.boolean(),
        groupName: v.optional(v.string()),
        lastMessageId: v.optional(v.id("messages")),
    }),

    members: defineTable({
        userId: v.id("users"),
        conversationId: v.id("conversations"),
        lastReadMessageId: v.optional(v.id("messages")),
        isAdmin: v.optional(v.boolean()),
    })
        .index("by_userId", ["userId"])
        .index("by_conversationId", ["conversationId"])
        .index("by_conversationId_userId", ["conversationId", "userId"]),

    messages: defineTable({
        senderId: v.id("users"),
        conversationId: v.id("conversations"),
        content: v.string(),
        isDeleted: v.optional(v.boolean()),
        readBy: v.optional(v.array(v.id("users"))),
        replyToId: v.optional(v.id("messages")),
    }).index("by_conversationId", ["conversationId"]),

    reactions: defineTable({
        messageId: v.id("messages"),
        userId: v.id("users"),
        emoji: v.string(),
    }).index("by_messageId", ["messageId"])
        .index("by_messageId_userId_emoji", ["messageId", "userId", "emoji"]),

    typingIndicators: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        expiresAt: v.number(),
    }).index("by_conversationId", ["conversationId"])
        .index("by_conversationId_userId", ["conversationId", "userId"]),
});
