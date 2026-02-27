import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
    args: {
        name: v.optional(v.string()),
        email: v.string(),
        image: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called syncUser without authenticated user");
        }

        const { tokenIdentifier } = identity;

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
            .unique();

        if (existingUser) {
            // Update the user details
            await ctx.db.patch(existingUser._id, {
                name: args.name,
                email: args.email,
                image: args.image,
                isOnline: true,
            });
            return existingUser._id;
        } else {
            // Create new user
            const newUserId = await ctx.db.insert("users", {
                tokenIdentifier,
                name: args.name,
                email: args.email,
                image: args.image,
                isOnline: true,
            });
            return newUserId;
        }
    },
});

export const getUsers = query({
    args: { searchTerm: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        let users = await ctx.db.query("users").collect();

        // Filter out the current user
        users = users.filter((u) => u.tokenIdentifier !== identity.tokenIdentifier);

        if (args.searchTerm) {
            const lowerSearch = args.searchTerm.toLowerCase();
            users = users.filter((u) => u.name?.toLowerCase().includes(lowerSearch));
        }

        return users;
    },
});

export const setOnlineStatus = mutation({
    args: { isOnline: v.boolean() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (user) {
            await ctx.db.patch(user._id, { isOnline: args.isOnline });
        }
    },
});

export const getAllUsersDebug = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    }
});
