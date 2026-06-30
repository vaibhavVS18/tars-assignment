import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkThemeProvider } from "@/providers/ClerkThemeProvider";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";


import Script from 'next/script';

// inside RootLayout, before </body>:


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tars Chat",
  description: "Tars Chat Application Assignment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ClerkThemeProvider>
            <ConvexClientProvider>
              <ThemeToggle />
              {children}

      <Script
        src="https://journiks.vercel.app/widget.js"
        data-key="jk_live_77e703fdb5a9374c41dcab471bbf8cda12b06322aa563d9991efe881d69000cf"
        strategy="lazyOnload"
      />

            </ConvexClientProvider>
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
