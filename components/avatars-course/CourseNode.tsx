"use client";

export type NodeState = "locked" | "unlocked" | "completed" | "stub";

interface CourseNodeProps {
  title: string;
  state: NodeState;
  stars: 0 | 1 | 2 | 3;
  onPress: () => void;
  align: "left" | "center" | "right";
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

export function CourseNode({ title, state, stars, onPress, align }: CourseNodeProps) {
  const disabled = state === "locked" || state === "stub";

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 w-24 ${ALIGN_CLASS[align]} ${disabled ? "opacity-40" : "active:scale-95"} transition-transform`}
      aria-label={title}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
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
        {state === "locked" || state === "stub" ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        ) : state === "completed" ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <polygon points="6 4 20 12 6 20" />
          </svg>
        )}
      </div>
      <span className="text-white text-xs font-medium text-center leading-tight line-clamp-2">{title}</span>
      {state === "completed" && <StarRow stars={stars} />}
      {state === "stub" && <span className="text-white/30 text-[10px]">Coming soon</span>}
    </button>
  );
}
