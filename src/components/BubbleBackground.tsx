"use client";

// Animated floating 3D bubble background — works for light and dark modes.
const BUBBLES = [
    { size: 220, left: "5%", top: "60%", delay: "0s", duration: "9s", opacity: 0.20 },
    { size: 150, left: "18%", top: "15%", delay: "1.5s", duration: "11s", opacity: 0.18 },
    { size: 300, left: "38%", top: "55%", delay: "0.8s", duration: "13s", opacity: 0.14 },
    { size: 120, left: "57%", top: "10%", delay: "3s", duration: "10s", opacity: 0.22 },
    { size: 260, left: "72%", top: "50%", delay: "0.3s", duration: "12s", opacity: 0.16 },
    { size: 100, left: "87%", top: "20%", delay: "2s", duration: "8s", opacity: 0.24 },
    { size: 180, left: "50%", top: "30%", delay: "5s", duration: "14s", opacity: 0.13 },
    { size: 80, left: "28%", top: "75%", delay: "4s", duration: "7s", opacity: 0.26 },
    { size: 200, left: "80%", top: "75%", delay: "6s", duration: "15s", opacity: 0.12 },
    { size: 110, left: "65%", top: "68%", delay: "2.5s", duration: "10s", opacity: 0.20 },
];

// Per-bubble color palette: a mix of indigo, blue, violet
const COLORS_LIGHT = [
    "99,102,241",   // indigo
    "59,130,246",   // blue
    "139,92,246",   // violet
    "99,102,241",
    "59,130,246",
    "139,92,246",
    "99,102,241",
    "59,130,246",
    "139,92,246",
    "99,102,241",
];

const COLORS_DARK = [
    "129,140,248",  // indigo-400
    "56,189,248",   // sky-400
    "167,139,250",  // violet-400
    "129,140,248",
    "56,189,248",
    "167,139,250",
    "129,140,248",
    "56,189,248",
    "167,139,250",
    "129,140,248",
];

export default function BubbleBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <style>{`
                @keyframes bobUp {
                    0%   { transform: translateY(0px); }
                    50%  { transform: translateY(-40px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>

            {/* Light mode bubbles */}
            <div className="block dark:hidden absolute inset-0">
                {BUBBLES.map((b, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: b.left,
                            top: b.top,
                            width: b.size,
                            height: b.size,
                            borderRadius: "50%",
                            background: `radial-gradient(circle at 35% 30%, rgba(${COLORS_LIGHT[i]}, ${b.opacity + 0.10}), rgba(${COLORS_LIGHT[i]}, ${b.opacity * 0.2}) 65%, transparent 85%)`,
                            boxShadow: `inset -10px -10px 24px rgba(0,0,0,0.06), inset 6px 6px 14px rgba(255,255,255,0.5)`,
                            border: `1.5px solid rgba(${COLORS_LIGHT[i]}, ${b.opacity * 0.4})`,
                            backdropFilter: "blur(1px)",
                            animation: `bobUp ${b.duration} ${b.delay} ease-in-out infinite`,
                        }}
                    />
                ))}
            </div>

            {/* Dark mode bubbles */}
            <div className="hidden dark:block absolute inset-0">
                {BUBBLES.map((b, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: b.left,
                            top: b.top,
                            width: b.size,
                            height: b.size,
                            borderRadius: "50%",
                            background: `radial-gradient(circle at 35% 30%, rgba(${COLORS_DARK[i]}, ${b.opacity + 0.05}), rgba(${COLORS_DARK[i]}, ${b.opacity * 0.15}) 65%, transparent 85%)`,
                            boxShadow: `inset -10px -10px 24px rgba(0,0,0,0.15), inset 6px 6px 14px rgba(255,255,255,0.07)`,
                            border: `1.5px solid rgba(${COLORS_DARK[i]}, ${b.opacity * 0.3})`,
                            backdropFilter: "blur(1px)",
                            animation: `bobUp ${b.duration} ${b.delay} ease-in-out infinite`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
