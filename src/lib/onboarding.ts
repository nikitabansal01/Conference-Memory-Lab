import type { OnboardingState, UserProgress } from "../models/types.js";

export const ONBOARDING_STEP_COUNT = 5;
export const ONBOARDING_LOOP_SUBSTEPS = 5;

export function defaultOnboardingState(): OnboardingState {
  return { completed: false, step: 0, loopSubStep: 0 };
}

export function normalizeOnboarding(progress: UserProgress): {
  progress: UserProgress;
  onboarding: OnboardingState;
  shouldPersist: boolean;
} {
  if (progress.onboarding) {
    // Reset legacy auto-completed states from the old session-count migration.
    if (progress.onboarding.completed && !progress.onboarding.explicit) {
      const onboarding = defaultOnboardingState();
      return {
        progress: { ...progress, onboarding },
        onboarding,
        shouldPersist: true,
      };
    }
    return { progress, onboarding: progress.onboarding, shouldPersist: false };
  }

  return { progress, onboarding: defaultOnboardingState(), shouldPersist: false };
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

  if (patch.skipped || patch.completed) {
    next.explicit = true;
  }

  if (patch.explicit === false) {
    next.explicit = false;
  }

  if (patch.skipped) {
    next.completed = true;
  }

  if (patch.completed) {
    next.completed = true;
    next.step = ONBOARDING_STEP_COUNT;
  }

  return next;
}
