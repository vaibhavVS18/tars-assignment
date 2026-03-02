"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    // Suppress hydration warning to smoothly inject theme
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
