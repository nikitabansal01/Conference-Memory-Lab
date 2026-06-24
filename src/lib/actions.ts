import type { EventSession, ExpertiseProfile } from "../models/types.js";
import { resolveSessionTitle } from "./session.js";
import { buildConnectionDrafts } from "./connection-drafts.js";
import { safePlatformLabel } from "./content-hub.js";
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

export type ActionGoal = "people" | "content" | "loop";

export interface ActionItem {
  id: string;
  type: ActionType;
  label: string;
  description: string;
  priority: number;
  sessionId?: string;
  sessionTitle?: string;
  tab?: string;
  goal?: ActionGoal;
  platform?: string;
}

const STAGE_TAB: Record<EventSession["stage"], string> = {
  ingested: "attend",
  extracted: "think",
  synthesized: "connect",
  drafted: "create",
  reviewed: "review",
  published: "think",
};

const STAGE_LABEL: Record<EventSession["stage"], string> = {
  ingested: "Attend",
  extracted: "Think",
  synthesized: "Connect",
  drafted: "Create",
  reviewed: "Review",
  published: "Complete",
};

export function sessionNextTab(session: EventSession): string {
  return STAGE_TAB[session.stage] ?? "attend";
}

export function sessionLoopLabel(session: EventSession): string {
  return STAGE_LABEL[session.stage] ?? "Attend";
}

export function actionGoal(action: ActionItem): ActionGoal {
  if (action.goal) return action.goal;
  if (action.type === "connect" || action.tab === "connect") return "people";
  if (
    action.type === "create" ||
    action.type === "review" ||
    action.tab === "create" ||
    action.tab === "review"
  ) {
    return "content";
  }
  return "loop";
}

function withSessionMeta(item: Omit<ActionItem, "sessionTitle">, session: EventSession): ActionItem {
  return {
    ...item,
    sessionTitle: resolveSessionTitle(session),
    goal: item.goal ?? actionGoal(item as ActionItem),
  };
}

export function buildSessionActionItems(
  session: EventSession,
  profile: ExpertiseProfile
): ActionItem[] {
  const items: ActionItem[] = [];

  if (!session.eventUrl) {
    items.push(
      withSessionMeta(
        {
          id: `add-link-${session.id}`,
          type: "add_event_link",
          label: `Add link to “${resolveSessionTitle(session)}”`,
          description: "Paste the Luma, Eventbrite, or conference page",
          priority: 85,
          sessionId: session.id,
          tab: "attend",
        },
        session
      )
    );
  }

  const stageActions: Record<EventSession["stage"], ActionItem | null> = {
    ingested: {
      id: `attend-${session.id}`,
      type: "remember",
      label: "Capture what you learned",
      description: `Finish processing notes from “${resolveSessionTitle(session)}”`,
      priority: 80,
      sessionId: session.id,
      tab: "attend",
    },
    extracted: {
      id: `think-${session.id}`,
      type: "think",
      label: "Think deeper about this event",
      description: `What mattered at “${resolveSessionTitle(session)}” — for your lens, not a recap`,
      priority: 80,
      sessionId: session.id,
      tab: "think",
    },
    synthesized: {
      id: `connect-${session.id}`,
      type: "connect",
      label: "Reach out while it's fresh",
      description: `Draft follow-ups from “${resolveSessionTitle(session)}” before you publish`,
      priority: 80,
      sessionId: session.id,
      tab: "connect",
    },
    drafted: {
      id: `create-${session.id}`,
      type: "create",
      label: "Draft your take from this event",
      description: `Turn “${resolveSessionTitle(session)}” insights into a post you can tag people in`,
      priority: 75,
      sessionId: session.id,
      tab: "create",
    },
    reviewed: {
      id: `review-${session.id}`,
      type: "review",
      label: "Review before you share",
      description: `Final check on grounding and voice for “${resolveSessionTitle(session)}”`,
      priority: 70,
      sessionId: session.id,
      tab: "review",
    },
    published: null,
  };

  const stageAction = stageActions[session.stage];
  if (stageAction) items.push(withSessionMeta(stageAction, session));

  const connectionDrafts = buildConnectionDrafts(session, profile);
  const eventPageDrafts = connectionDrafts.filter((draft) => draft.source === "event_page");
  if (eventPageDrafts.length > 0 && (session.stage === "ingested" || session.stage === "extracted")) {
    items.push(
      withSessionMeta(
        {
          id: `connect-speakers-${session.id}`,
          type: "connect",
          label: `Connect with speakers from “${resolveSessionTitle(session)}”`,
          description: `${eventPageDrafts.length} personalized connection note${eventPageDrafts.length === 1 ? "" : "s"} ready from the event page`,
          priority: 78,
          sessionId: session.id,
          tab: "connect",
          goal: "people",
        },
        session
      )
    );
  }

  if (
    session.followUpDrafts.length > 0 &&
    (session.stage === "synthesized" || session.stage === "drafted")
  ) {
    for (const draft of session.followUpDrafts) {
      const person = session.people.find((p) => p.id === draft.personId);
      items.push(
        withSessionMeta(
          {
            id: `followup-${draft.id}`,
            type: "connect",
            label: `Follow up with ${person?.name ?? "someone you met"}`,
            description: `At “${resolveSessionTitle(session)}” · send before you publish so you can tag them`,
            priority: 82,
            sessionId: session.id,
            tab: "connect",
            goal: "people",
          },
          session
        )
      );
    }
  }

  for (const draft of session.contentDrafts) {
    if (session.stage !== "drafted" && session.stage !== "reviewed") continue;
    const platformLabelText = safePlatformLabel(draft.platform);
    items.push(
      withSessionMeta(
        {
          id: `draft-${draft.id}`,
          type: "create",
          label: `Finish your ${platformLabelText} draft`,
          description:
            session.contentAngles.find((a) => a.id === draft.angleId)?.title ??
            "Review and refine your post",
          priority: 76,
          sessionId: session.id,
          tab: "create",
          goal: "content",
          platform: draft.platform,
        },
        session
      )
    );
  }

  if (profile.experienceHighlights?.length && session.themes.length > 0) {
    const theme =
      session.themes.find((t) => t.relation === "extends") ?? session.themes[0];
    items.push(
      withSessionMeta(
        {
          id: `apply-${session.id}-${theme.id}`,
          type: "reflect",
          label: "Apply insight to your work",
          description:
            theme.profileConnection ??
            `Connect "${theme.label}" to a current project`,
          priority: 65,
          sessionId: session.id,
          tab: "think",
        },
        session
      )
    );
  }

  return items.sort((a, b) => b.priority - a.priority);
}

export function buildAllActionItems(
  sessions: EventSession[],
  profile: ExpertiseProfile
): ActionItem[] {
  const items: ActionItem[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const sessionItems = buildSessionActionItems(sessions[i], profile);
    for (const item of sessionItems) {
      items.push({ ...item, priority: item.priority - i * 5 });
    }
  }
  return items.sort((a, b) => b.priority - a.priority);
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
      label: "Complete Your Unique Lens",
      description: profileStatus.missing[0] ?? "Upload resume or write a short bio",
      priority: 100,
      goal: "loop",
    });
  }

  if (sessions.length === 0) {
    items.push({
      id: "log-event",
      type: "log_event",
      label: "Add your recent or upcoming event",
      description:
        "Paste notes and add the event link (Luma, Eventbrite, or conference site)",
      priority: 90,
      goal: "loop",
    });
    return items.sort((a, b) => b.priority - a.priority);
  }

  items.push(...buildSessionActionItems(sessions[0], profile));
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
    message: `Add the event page for “${resolveSessionTitle(session)}” (the event you already attended) — Luma, Eventbrite, or conference site.`,
  };
}

export function capabilitiesUnlocked(level: number): string[] {
  const caps: string[] = ["Attend"];
  if (level >= 1) caps.push("Think");
  if (level >= 2) caps.push("Connect", "Create");
  if (level >= 3) caps.push("Review");
  return caps;
}
