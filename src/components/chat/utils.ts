import { format, isToday } from "date-fns";

export function formatMessageTime(timestamp: number): string {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "h:mm a");
    if (date.getFullYear() !== new Date().getFullYear())
        return format(date, "MMM d, yyyy h:mm a");
    return format(date, "MMM d, h:mm a");
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"] as const;
