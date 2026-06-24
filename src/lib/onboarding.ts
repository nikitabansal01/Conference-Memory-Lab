import type { OnboardingState, UserProgress } from "../models/types.js";

export const ONBOARDING_STEP_COUNT = 5;
export const ONBOARDING_LOOP_SUBSTEPS = 5;

export function defaultOnboardingState(): OnboardingState {
  return { completed: false, step: 0, loopSubStep: 0 };
}

export function normalizeOnboarding(
  progress: UserProgress,
  sessionCount: number
): { progress: UserProgress; onboarding: OnboardingState } {
  if (progress.onboarding) {
    return { progress, onboarding: progress.onboarding };
  }

  if (sessionCount > 0) {
    const onboarding: OnboardingState = { completed: true, step: ONBOARDING_STEP_COUNT, loopSubStep: 0 };
    return {
      progress: { ...progress, onboarding },
      onboarding,
    };
  }

  return { progress, onboarding: defaultOnboardingState() };
}

export function shouldShowOnboarding(onboarding: OnboardingState): boolean {
  return !onboarding.completed && !onboarding.skipped;
}

export function mergeOnboardingState(
  current: OnboardingState | undefined,
  patch: Partial<OnboardingState>
): OnboardingState {
  const base = current ?? defaultOnboardingState();
  const next: OnboardingState = {
    ...base,
    ...patch,
    step: patch.step ?? base.step,
    loopSubStep: patch.loopSubStep ?? base.loopSubStep,
  };

  if (patch.skipped) {
    next.completed = true;
  }

  if (patch.completed) {
    next.completed = true;
    next.step = ONBOARDING_STEP_COUNT;
  }

  return next;
}
