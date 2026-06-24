import type { EventSession } from "../models/types.js";

export interface LearningStreak {
  activeDays: number;
  week: { label: string; active: boolean }[];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function startOfWeekMonday(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + offset);
  return monday;
}

export function computeLearningStreak(sessions: EventSession[]): LearningStreak {
  const activeDates = new Set<string>();
  for (const session of sessions) {
    activeDates.add(dayKey(session.updatedAt ?? session.createdAt));
  }

  const today = new Date();
  const monday = startOfWeekMonday(today);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const week: { label: string; active: boolean }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push({
      label: dayLabels[i],
      active: activeDates.has(dayKey(d.toISOString())),
    });
  }

  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  while (activeDates.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { activeDays: streak, week };
}
