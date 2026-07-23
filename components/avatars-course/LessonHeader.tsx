"use client";

interface LessonHeaderProps {
  onClose: () => void;
  turnLabel: string;
}

export function LessonHeader({ onClose, turnLabel }: LessonHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-2">
      <button
        onClick={onClose}
        className="w-10 h-10 flex items-center justify-center text-white active:opacity-70"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <span className="text-white/50 text-sm font-medium">{turnLabel}</span>
      <div className="w-10 h-10" />
    </div>
  );
}
