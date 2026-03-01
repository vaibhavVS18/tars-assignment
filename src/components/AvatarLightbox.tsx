"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface AvatarLightboxProps {
    src: string;
    name: string;
    onClose: () => void;
    isAvatar?: boolean; // true = profile photo (circle), false = chat image (natural shape)
}

export default function AvatarLightbox({ src, name, onClose, isAvatar = true }: AvatarLightboxProps) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                aria-label="Close"
            >
                <X className="w-6 h-6" />
            </button>

            {isAvatar ? (
                /* ── Profile avatar — circle ── */
                <div
                    className="flex flex-col items-center gap-3 p-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    <img
                        src={src}
                        alt={name}
                        className="w-64 h-64 sm:w-80 sm:h-80 rounded-full object-cover shadow-2xl border-4 border-white/20"
                    />
                    <p className="text-white font-semibold text-base drop-shadow">{name}</p>
                </div>
            ) : (
                /* ── Chat image — natural shape, full size ── */
                <div
                    className="relative max-w-[92vw] max-h-[88vh] flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <img
                        src={src}
                        alt={name}
                        className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}
