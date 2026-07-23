"use client";

import type { Lesson } from "@/lib/avatars-course/types";
import type { ScenarioResult } from "@/lib/avatars-course/scenario-results";
import { CourseNode, type NodeState } from "./CourseNode";

interface CourseMapProps {
  lessons: Lesson[];
  results: Record<string, ScenarioResult>;
  onSelect: (lesson: Lesson) => void;
}

const ALIGN_CYCLE = ["center", "right", "center", "left"] as const;

export function CourseMap({ lessons, results, onSelect }: CourseMapProps) {
  const published = lessons.filter((l) => l.status === "published").sort((a, b) => a.order - b.order);
  const publishedUnlockedIds = new Set<string>();
  let chainOpen = true;
  for (const lesson of published) {
    if (chainOpen) publishedUnlockedIds.add(lesson.id);
    const result = results[lesson.scenarioId];
    chainOpen = chainOpen && !!result && result.stars >= 1;
  }

  const sorted = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col-reverse gap-6 px-4 pb-10">
      {sorted.map((lesson, i) => {
        const result = results[lesson.scenarioId];
        let state: NodeState;
        if (lesson.status === "stub") {
          state = "stub";
        } else if (result && result.stars >= 1) {
          state = "completed";
        } else if (publishedUnlockedIds.has(lesson.id)) {
          state = "unlocked";
        } else {
          state = "locked";
        }

        return (
          <CourseNode
            key={lesson.id}
            title={lesson.title}
            state={state}
            stars={(result?.stars ?? 0) as 0 | 1 | 2 | 3}
            align={ALIGN_CYCLE[i % ALIGN_CYCLE.length]}
            onPress={() => {
              if (state === "unlocked" || state === "completed") onSelect(lesson);
            }}
          />
        );
      })}
    </div>
  );
}
