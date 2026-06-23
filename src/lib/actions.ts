import type { EventSession, ExpertiseProfile } from "../models/types.js";
import type { ProfileStatus } from "./profile-status.js";
import { parseEventUrl } from "./event-url.js";

export type ActionType =
  | "complete_lens"
  | "log_event"
  | "add_event_link"
  | "remember"
  | "think"
  | "create"
  | "connect"
  | "review"
  | "reflect";

export interface ActionItem {
  id: string;
  type: ActionType;
  label: string;
  description: string;
  priority: number;
  sessionId?: string;
  tab?: string;
}

function whatMatteredLine(session: EventSession): string {
  const nonObvious = session.claims.find((c) => c.text.includes("[non-obvious]"));
  if (nonObvious) return nonObvious.text.replace("[non-obvious] ", "").slice(0, 120);
  const theme = session.themes[0];
  if (theme) return theme.label;
  return "Capture what stood out from this event";
}

export function buildActionItems(
  sessions: EventSession[],
  profileStatus: ProfileStatus,
  profile: ExpertiseProfile
): ActionItem[] {
  const items: ActionItem[] = [];

  if (!profileStatus.complete) {
    items.push({
      id: "complete-lens",
      type: "complete_lens",
      label: "Complete Your Lens",
      description: profileStatus.missing[0] ?? "Upload resume or write a short bio",
      priority: 100,
    });
  }

  if (sessions.length === 0) {
    items.push({
      id: "log-event",
      type: "log_event",
      label: "Log your first event",
      description: "Paste notes and add the event link (Luma, Eventbrite, or conference site)",
      priority: 90,
    });
    return items.sort((a, b) => b.priority - a.priority);
  }

  const latest = sessions[0];

  if (!latest.eventUrl) {
    items.push({
      id: `add-link-${latest.id}`,
      type: "add_event_link",
      label: `Add link to “${latest.title}”`,
      description: `Past event you attended · paste the Luma, Eventbrite, or conference page`,
      priority: 85,
      sessionId: latest.id,
    });
  }

  const stageActions: Record<EventSession["stage"], ActionItem | null> = {
    ingested: {
      id: `attend-${latest.id}`,
      type: "remember",
      label: "Capture what you learned",
      description: `Finish processing notes from “${latest.title}”`,
      priority: 80,
      sessionId: latest.id,
      tab: "attend",
    },
    extracted: {
      id: `think-${latest.id}`,
      type: "think",
      label: "Think deeper about this event",
      description: `What mattered at “${latest.title}” — for your lens, not a recap`,
      priority: 80,
      sessionId: latest.id,
      tab: "think",
    },
    synthesized: {
      id: `connect-${latest.id}`,
      type: "connect",
      label: "Reach out while it's fresh",
      description: `Draft follow-ups from “${latest.title}” before you publish`,
      priority: 80,
      sessionId: latest.id,
      tab: "connect",
    },
    drafted: {
      id: `create-${latest.id}`,
      type: "create",
      label: "Draft your take from this event",
      description: `Turn “${latest.title}” insights into a post you can tag people in`,
      priority: 75,
      sessionId: latest.id,
      tab: "create",
    },
    reviewed: {
      id: `review-${latest.id}`,
      type: "review",
      label: "Review before you share",
      description: `Final check on grounding and voice for “${latest.title}”`,
      priority: 70,
      sessionId: latest.id,
      tab: "review",
    },
    published: null,
  };

  const stageAction = stageActions[latest.stage];
  if (stageAction) items.push(stageAction);

  if (latest.followUpDrafts.length > 0 && (latest.stage === "synthesized" || latest.stage === "drafted")) {
    const first = latest.followUpDrafts[0];
    const person = latest.people.find((p) => p.id === first.personId);
    items.push({
      id: `followup-${first.id}`,
      type: "connect",
      label: `Follow up with ${person?.name ?? "someone you met"}`,
      description: `At “${latest.title}” · send before you publish so you can tag them`,
      priority: 82,
      sessionId: latest.id,
      tab: "connect",
    });
  }

  if (latest.contentDrafts.length > 0 && latest.stage === "drafted") {
    items.push({
      id: `draft-${latest.contentDrafts[0].id}`,
      type: "create",
      label: "Finish your LinkedIn draft",
      description: latest.contentAngles[0]?.title ?? "Review and refine your post",
      priority: 76,
      sessionId: latest.id,
      tab: "create",
    });
  }

  if (profile.experienceHighlights?.length && latest.themes.length > 0) {
    const theme = latest.themes.find((t) => t.relation === "extends") ?? latest.themes[0];
    items.push({
      id: `apply-${latest.id}-${theme.id}`,
      type: "reflect",
      label: "Apply insight to your work",
      description: theme.profileConnection ?? `Connect "${theme.label}" to a current project`,
      priority: 65,
      sessionId: latest.id,
      tab: "think",
    });
  }

  return items.sort((a, b) => b.priority - a.priority);
}

export function eventLinkNudge(session: EventSession): {
  show: boolean;
  message: string;
} {
  if (session.eventUrl) {
    const info = parseEventUrl(session.eventUrl);
    return {
      show: false,
      message: info ? `Linked: ${info.label}` : "Event link saved",
    };
  }
  return {
    show: true,
    message: `Add the event page for “${session.title}” (the event you already attended) — Luma, Eventbrite, or conference site.`,
  };
}

export function capabilitiesUnlocked(level: number): string[] {
  const caps: string[] = ["Attend"];
  if (level >= 1) caps.push("Think");
  if (level >= 2) caps.push("Connect", "Create");
  if (level >= 3) caps.push("Review");
  return caps;
}
