

export function formatMessageTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}


export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"] as const;
