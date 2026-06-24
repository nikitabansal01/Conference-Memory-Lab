# Onboarding Walkthrough

First-run guided tour for new users. Implemented in the home shell (`public/app.js`) with progress persisted via `PATCH /api/onboarding`.

## Steps

1. **Your Unique Lens** — Prompt for learning goals (LLM, evals, UI/UX, industry verticals), ongoing projects to apply learnings to, and voice/expertise context. Primary action opens the lens modal.
2. **Six capacity levels** — Spotlight the sidebar capacity arc; list L1–L6 (Observer → Trusted Delegate), starting at Level 1.
3. **Add an event** — Nudge to paste a Luma or conference link for a recent or upcoming event. Opens the add-event flow.
4. **Five-step loop** — Walk Attend → Think → Connect → Create → Review one sub-step at a time with an inline loop preview.
5. **Connections preview** — Open Connections with LinkedIn, Luma/calendar, and X shown even when locked, with trust framing.

## Behavior

- Auto-starts on first dashboard load when `showOnboarding` is true (no prior sessions, tour not completed/skipped).
- Existing users with logged events are auto-marked complete on first dashboard load.
- **Skip** dismisses the tour; **Replay app tour** on the home banner or **Help** in the sidebar restarts it.
- Each step answers what to do next — short copy, optional primary action, never a long blocking tutorial.

## API

- Dashboard returns `onboarding` and `showOnboarding`.
- `PATCH /api/onboarding` accepts `{ step, loopSubStep, completed, skipped }`.
