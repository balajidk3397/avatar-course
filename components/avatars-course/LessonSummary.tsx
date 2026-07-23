"use client";

interface LessonSummaryProps {
  stars: 1 | 2 | 3;
  title: string;
  onContinue: () => void;
}

export function LessonSummary({ stars, title, onContinue }: LessonSummaryProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <svg
            key={i}
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill={i <= stars ? "hsl(45 95% 60%)" : "none"}
            stroke={i <= stars ? "hsl(45 95% 60%)" : "rgba(255,255,255,0.25)"}
            strokeWidth="1.5"
          >
            <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.5 5.5 21 7.5 13.5 2 9 9 9" />
          </svg>
        ))}
      </div>
      <div className="text-center">
        <h2 className="text-white text-2xl font-bold mb-1">Lesson Complete!</h2>
        <p className="text-white/50 text-sm">{title}</p>
      </div>
      <button
        onClick={onContinue}
        className="w-full rounded-2xl py-4 text-white font-semibold active:opacity-80"
        style={{ background: "hsl(258 90% 66%)" }}
      >
        Continue
      </button>
    </div>
  );
}
