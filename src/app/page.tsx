"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { Id } from "../../convex/_generated/dataModel";

const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 320;

export default function Home() {
  const { isLoaded, userId } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [isDesktop, setIsDesktop] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(SIDEBAR_DEFAULT);

  // Detect desktop after mount (avoids SSR mismatch)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── History API: push state when opening a conversation on mobile ──
  const openConversation = useCallback((id: Id<"conversations">) => {
    setSelectedConversationId(id);
    // Push a history entry so the browser back button can pop it
    window.history.pushState({ conversationOpen: true }, "");
  }, []);

  const closeConversation = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  // Listen for browser/Android back button (popstate)
  useEffect(() => {
    const onPopState = () => {
      // If a conversation is open, close it instead of leaving the page
      setSelectedConversationId(prev => {
        if (prev !== null) return null;
        return prev; // already on sidebar, let browser navigate normally
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ── Drag-to-resize (desktop only) ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta));
      setSidebarWidth(next);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (!isLoaded || !userId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // ── Mobile: full-screen sidebar ↔ full-screen chat ──
  if (!isDesktop) {
    return (
      <div className="flex flex-col h-screen w-full bg-white overflow-hidden text-gray-900 font-sans">
        {selectedConversationId ? (
          <ChatArea
            conversationId={selectedConversationId}
            onBack={closeConversation}
          />
        ) : (
          <div className="flex-1 overflow-hidden">
            <Sidebar
              selectedConversationId={selectedConversationId}
              onSelectConversation={openConversation}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Desktop: resizable split view ──
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-gray-900 font-sans">
      {/* Sidebar */}
      <div
        className="flex-shrink-0 border-r border-gray-100 flex flex-col"
        style={{ width: sidebarWidth }}
      >
        <Sidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex-shrink-0 w-1 cursor-col-resize flex items-center justify-center group relative z-10 hover:bg-blue-100 transition-colors"
        title="Drag to resize"
      >
        <div className="absolute h-8 w-1 rounded-full bg-gray-200 group-hover:bg-blue-400 transition-colors" />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative min-w-0">
        {selectedConversationId ? (
          <ChatArea
            conversationId={selectedConversationId}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium tracking-tight text-gray-600">Your Messages</h2>
            <p className="mt-2 text-sm max-w-sm text-center">Select a conversation from the sidebar or start a new one to begin chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}