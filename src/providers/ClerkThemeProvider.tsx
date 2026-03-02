"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import React from "react";

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();

    return (
        <ClerkProvider
            appearance={{
                baseTheme: resolvedTheme === "dark" ? dark : undefined,
                elements: {
                    // Optional styling adjustments can go here
                }
            }}
        >
            {children}
        </ClerkProvider>
    );
}
