"use client";

import { useEffect, useRef, useState } from "react";
import { getRiveCharacter } from "@/lib/avatars-course/rive-config";
import { RiveCharacter } from "./RiveCharacter";

export type NodeState = "locked" | "unlocked" | "completed" | "stub";

interface CourseNodeProps {
  title: string;
  state: NodeState;
  stars: 0 | 1 | 2 | 3;
  onPress: () => void;
  align: "left" | "center" | "right";
  characterId: string;
}

const ALIGN_CLASS: Record<CourseNodeProps["align"], string> = {
  left: "self-start ml-6",
  center: "self-center",
  right: "self-end mr-6",
};

function StarRow({ stars }: { stars: 0 | 1 | 2 | 3 }) {
  return (
    <div className="flex gap-0.5 mt-1.5">
      {[1, 2, 3].map((i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={i <= stars ? "hsl(45 95% 60%)" : "none"}
          stroke={i <= stars ? "hsl(45 95% 60%)" : "rgba(255,255,255,0.25)"}
          strokeWidth="2"
        >
          <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.5 5.5 21 7.5 13.5 2 9 9 9" />
        </svg>
      ))}
    </div>
  );
}

export function CourseNode({ title, state, stars, onPress, align, characterId }: CourseNodeProps) {
  const disabled = state === "locked" || state === "stub";
  const config = getRiveCharacter(characterId);

  // Lazy-mount the Rive canvas only once this node scrolls near the viewport —
  // up to 30 nodes on the track, many sharing the same .riv file, so mounting all
  // of them at once would mean dozens of concurrent WASM animation loops. Once
  // visible, stays mounted (no unmount-on-scroll-away) to avoid restarting the
  // idle animation every time the user scrolls past a node twice.
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const nodeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasBeenVisible) return;
    const el = nodeRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasBeenVisible]);

  return (
    <button
      ref={nodeRef}
      onClick={onPress}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 w-24 ${ALIGN_CLASS[align]} ${disabled ? "opacity-40" : "active:scale-95"} transition-transform`}
      aria-label={title}
    >
      <div
        className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background:
            state === "completed"
              ? "linear-gradient(135deg, hsl(45 95% 55%), hsl(35 95% 55%))"
              : state === "unlocked"
              ? "linear-gradient(135deg, hsl(258 90% 66%), hsl(280 90% 60%))"
              : "hsl(228 20% 18%)",
          boxShadow: state === "unlocked" ? "0 4px 20px hsl(258 90% 66% / 0.4)" : undefined,
        }}
      >
        {hasBeenVisible ? (
          <RiveCharacter config={config} isSpeaking={false} isListening={false} size={52} />
        ) : (
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 52, height: 52, background: config?.fallbackColor ?? "hsl(258 90% 66%)" }}
          >
            <span style={{ fontSize: 22 }}>{config?.fallbackEmoji ?? "🙂"}</span>
          </div>
        )}

        {state === "completed" && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
            style={{ background: "hsl(45 95% 50%)", borderColor: "hsl(228 22% 13%)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        {(state === "locked" || state === "stub") && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
            style={{ background: "hsl(228 20% 22%)", borderColor: "hsl(228 22% 13%)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
        )}
      </div>
      <span className="text-white text-xs font-medium text-center leading-tight line-clamp-2">{title}</span>
      {state === "completed" && <StarRow stars={stars} />}
      {state === "stub" && <span className="text-white/30 text-[10px]">Coming soon</span>}
    </button>
  );
}
