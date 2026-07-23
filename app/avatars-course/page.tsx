"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/app/user-context";
import { COURSE, getPublishedLessons } from "@/lib/avatars-course/course-data";
import { fetchScenarioResults, type ScenarioResult } from "@/lib/avatars-course/scenario-results";
import { CourseMap } from "@/components/avatars-course/CourseMap";
import type { Lesson } from "@/lib/avatars-course/types";

function Header() {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-2">
      <button
        onClick={() => router.push("/")}
        className="w-10 h-10 flex items-center justify-center text-white active:opacity-70"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <h1 className="text-white font-bold text-lg">Avatar Course</h1>
      <div className="w-10 h-10" />
    </div>
  );
}

export default function AvatarsCoursePage() {
  const router = useRouter();
  const { ready, auth } = useUser();
  const [results, setResults] = useState<Record<string, ScenarioResult>>({});
  const [loadingResults, setLoadingResults] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const published = getPublishedLessons();
    let cancelled = false;
    fetchScenarioResults(
      published.map((l) => l.scenarioId),
      auth
    ).then((r) => {
      if (!cancelled) {
        setResults(r);
        setLoadingResults(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, auth]);

  const handleSelect = (lesson: Lesson) => {
    router.push(`/avatars-course/${lesson.id}`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#07080F" }}>
      <Header />
      <p className="text-white/50 text-sm text-center px-8 pb-4">
        Practice real conversations with your AI tutor — complete lessons in order to unlock the next.
      </p>
      {!ready || loadingResults ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      ) : (
        <CourseMap lessons={COURSE} results={results} onSelect={handleSelect} />
      )}
    </div>
  );
}
