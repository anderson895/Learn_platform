import type { LessonStatus } from "@/theme/status";

/** Mga field ng `progress/{studentId}/lessons/{lessonId}`. */
export interface LessonProgressProps {
  lessonId: string;
  status: "in_progress" | "completed";
  bestQuizScore: number | null;
  quizAttempts: number;
  activitiesDone: string[];
  exercisesSubmitted: string[];
  reviewed: boolean;
  completedAt: Date | null;
  updatedAt: Date;
}

export const emptyProgress = (lessonId: string): LessonProgressProps => ({
  lessonId,
  status: "in_progress",
  bestQuizScore: null,
  quizAttempts: 0,
  activitiesDone: [],
  exercisesSubmitted: [],
  reviewed: false,
  completedAt: null,
  updatedAt: new Date(),
});

/** Ang kailangang impormasyon ng isang lesson para makuwenta ang status nito. */
export type BoardLesson = { lessonId: string; order: number; threshold: number };

/**
 * Accomplishment Threshold (Objective 2.6) at Color-Coded Progress (Objective 2.8).
 * - Bukas ang unang lesson.
 * - Mabubuksan lang ang susunod na lesson kapag "completed" na ang nauna.
 * - Completed ang lesson kapag ang pinakamataas na quiz score ay umabot sa threshold
 *   (o, kung walang quiz ang lesson, kapag minarkahan ito ng student na tapos).
 */
export class ProgressPolicy {
  static isCompleted(progress: LessonProgressProps | undefined): boolean {
    return progress?.status === "completed";
  }

  static meetsThreshold(score: number | null, threshold: number): boolean {
    return score !== null && score >= threshold;
  }

  /** Status ng bawat lesson, ayon sa pagkakasunod. */
  static statuses(lessons: BoardLesson[], progress: Map<string, LessonProgressProps>): Map<string, LessonStatus> {
    const result = new Map<string, LessonStatus>();
    let previousCompleted = true;
    for (const lesson of [...lessons].sort((a, b) => a.order - b.order)) {
      const entry = progress.get(lesson.lessonId);
      let status: LessonStatus;
      if (!previousCompleted) status = "locked";
      else if (ProgressPolicy.isCompleted(entry)) status = "completed";
      else if (entry && entry.quizAttempts > 0 && !ProgressPolicy.meetsThreshold(entry.bestQuizScore, lesson.threshold)) status = "below_threshold";
      else if (entry) status = "in_progress";
      else status = "not_started";
      result.set(lesson.lessonId, status);
      previousCompleted = status === "completed";
    }
    return result;
  }
}
