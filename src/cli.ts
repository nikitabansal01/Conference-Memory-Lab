#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EventType, TrustLevel } from "./models/types.js";
import { createSession } from "./lib/session.js";
import {
  loadProgress,
  saveProgress,
  saveSession,
  loadSession,
  listSessions,
  loadProfileOrExample,
  SESSIONS_DIR,
  ROOT,
} from "./lib/storage.js";
import {
  buildWorkflowPrompt,
  renderPromptForCursor,
  type WorkflowName,
} from "./lib/prompts.js";
import { mergeSessionUpdate, applyStageCompletion } from "./lib/complete.js";
import {
  getLevelDefinition,
  xpToNextLevel,
  canPerformAction,
  getCumulativeActions,
} from "./trust/levels.js";
import { formatLevelBadge } from "./gamification/xp.js";

const EVENT_TYPES: EventType[] = ["mixer", "panel", "conference", "webinar", "other"];

function usage(): void {
  console.log(`
Conference Memory Lab — CLI

  npm run lab -- new --title "..." --type mixer [--notes file] [--url luma-link]
  npm run lab -- list
  npm run lab -- show <session-id>
  npm run lab -- status
  npm run lab -- prompt <extract|synthesize|draft|self-critique> --session <id>
  npm run lab -- complete <extract|synthesize|draft> --session <id> --json <file>
  npm run lab -- bootstrap   # dev: unlock L2 (250 XP) to try full pipeline

Trust levels: L0 Observer → L6 Autopilot. See README.md for the full ladder.
`);
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = { _: "" };
  const rest = argv.slice(2);
  const cmdParts: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      cmdParts.push(arg);
    }
  }
  out._ = cmdParts.join(" ");
  return out;
}

async function cmdNew(args: Record<string, string | boolean>): Promise<void> {
  const title = String(args.title ?? "");
  const eventType = String(args.type ?? "mixer") as EventType;

  if (!title) {
    console.error("Error: --title is required");
    process.exit(1);
  }
  if (!EVENT_TYPES.includes(eventType)) {
    console.error(`Error: --type must be one of: ${EVENT_TYPES.join(", ")}`);
    process.exit(1);
  }

  let rawNotes = "";
  if (args.notes) {
    rawNotes = await readFile(String(args.notes), "utf-8");
  } else if (args["notes-text"]) {
    rawNotes = String(args["notes-text"]);
  } else {
    console.error("Error: provide --notes <file> or --notes-text \"...\"");
    process.exit(1);
  }

  const progress = await loadProgress();
  const { session, progress: updated } = createSession({
    title,
    eventType,
    rawNotes,
    eventUrl: args.url ? String(args.url) : undefined,
    location: args.location ? String(args.location) : undefined,
    userProgress: progress,
  });

  await saveSession(session);
  await saveProgress(updated);

  const def = getLevelDefinition(updated.level);
  console.log("\n✓ Session created");
  console.log(`  ID:    ${session.id}`);
  console.log(`  Title: ${session.title}`);
  console.log(`  Type:  ${session.eventType}`);
  console.log(`  ${formatLevelBadge(updated.level, def.name)} (+25 XP)`);
  console.log(`\nNext: npm run lab -- prompt extract --session ${session.id}`);
}

async function cmdList(): Promise<void> {
  const sessions = await listSessions();
  if (sessions.length === 0) {
    console.log("No sessions yet. Create one with: npm run lab -- new ...");
    return;
  }
  console.log("\nSessions:\n");
  for (const s of sessions) {
    console.log(`  ${s.id.slice(0, 8)}…  ${s.title}  [${s.stage}]  ${s.eventType}`);
  }
}

async function cmdShow(sessionId: string): Promise<void> {
  const sessions = await listSessions();
  const session = sessions.find((s) => s.id.startsWith(sessionId)) ?? (await loadSession(sessionId));

  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  console.log(JSON.stringify(session, null, 2));
}

async function cmdStatus(): Promise<void> {
  const progress = await loadProgress();
  const def = getLevelDefinition(progress.level);
  const next = xpToNextLevel(progress.totalXp);

  console.log("\n=== Conference Memory Lab — Progress ===\n");
  console.log(formatLevelBadge(progress.level, def.name));
  console.log(`XP: ${progress.totalXp}${next.next !== null ? ` (${next.xpNeeded} to L${next.next})` : " (MAX)"}`);
  if (next.next !== null) {
    const bar = "█".repeat(Math.floor(next.progressPct / 5)) + "░".repeat(20 - Math.floor(next.progressPct / 5));
    console.log(`[${bar}] ${next.progressPct}%`);
  }
  console.log(`\nEvents logged:     ${progress.eventsAttended}`);
  console.log(`Sessions completed: ${progress.sessionsCompleted}`);
  console.log(`Drafts approved:    ${progress.draftsApproved}`);
  console.log(`\nUnlocked actions (${getCumulativeActions(progress.level).length}):`);
  for (const action of getCumulativeActions(progress.level)) {
    console.log(`  • ${action}`);
  }
  console.log(`\nTagline: ${def.tagline}`);
}

async function cmdPrompt(workflow: WorkflowName, sessionId: string): Promise<void> {
  const sessions = await listSessions();
  const session = sessions.find((s) => s.id.startsWith(sessionId)) ?? (await loadSession(sessionId));

  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const progress = await loadProgress();
  const profile = workflow === "extract" ? null : await loadProfileOrExample();
  const userLevel = progress.level as TrustLevel;

  const gate = canPerformAction(userLevel, {
    extract: "run_extract",
    synthesize: "run_synthesize",
    draft: "generate_content_drafts",
    "self-critique": "self_critique",
  }[workflow]);

  if (!gate.allowed) {
    console.error(
      `\n🔒 Locked — "${workflow}" requires Level ${gate.requiredLevel} (${getLevelDefinition(gate.requiredLevel!).name}).`
    );
    console.error(`   You are Level ${userLevel}. Earn XP by completing sessions.\n`);
    console.error("   L0→L1: 100 XP  |  L1→L2: 250 XP  |  See specs/level-0.md for rewards.\n");
    process.exit(1);
  }

  const bundle = await buildWorkflowPrompt(workflow, session, profile, userLevel);
  const prompt = renderPromptForCursor(bundle);
  const outPath = join(SESSIONS_DIR, session.id, `prompt-${workflow}.md`);

  await import("node:fs/promises").then((fs) => fs.mkdir(join(SESSIONS_DIR, session.id), { recursive: true }));
  await writeFile(outPath, prompt);

  console.log(`\n✓ Prompt written: ${outPath.replace(ROOT + "/", "")}`);
  console.log("\n--- Run this prompt in Cursor, then paste JSON output back (import coming in v0.2) ---\n");
  console.log(prompt.slice(0, 1200) + (prompt.length > 1200 ? "\n\n… (truncated — see full file)" : ""));
}

async function cmdBootstrap(): Promise<void> {
  const progress = await loadProgress();
  const updated = {
    ...progress,
    totalXp: Math.max(progress.totalXp, 250),
    level: 2 as TrustLevel,
    unlockedActions: getCumulativeActions(2),
  };
  await saveProgress(updated);
  console.log("\n✓ Bootstrapped to Level 2 (Drafter) for development");
  console.log(formatLevelBadge(2, getLevelDefinition(2).name));
}

async function cmdComplete(
  stage: "extract" | "synthesize" | "draft",
  sessionId: string,
  jsonPath: string
): Promise<void> {
  const sessions = await listSessions();
  const session = sessions.find((s) => s.id.startsWith(sessionId)) ?? (await loadSession(sessionId));

  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const stageMap = {
    extract: "extracted" as const,
    synthesize: "synthesized" as const,
    draft: "drafted" as const,
  };

  const raw = await readFile(jsonPath, "utf-8");
  const update = JSON.parse(raw) as Partial<import("./models/types.js").EventSession>;
  const { stage: _ignored, ...updateWithoutStage } = update;

  const merged = mergeSessionUpdate(session, updateWithoutStage);
  const progress = await loadProgress();
  const result = applyStageCompletion(merged, progress, stageMap[stage]);

  await saveSession(result.session);
  await saveProgress(result.progress);

  console.log(`\n✓ Session updated → stage: ${result.session.stage}`);
  if (result.xpAwarded > 0) {
    console.log(`  +${result.xpAwarded} XP (total: ${result.progress.totalXp})`);
    if (result.leveledUp) {
      const def = getLevelDefinition(result.progress.level);
      console.log(`  🎉 Level up! ${formatLevelBadge(result.progress.level, def.name)}`);
    }
  }
}

async function main(): Promise<void> {
  const argv = process.argv;
  const command = argv[2];
  const args = parseArgs(argv);

  switch (command) {
    case "new":
      await cmdNew(args);
      break;
    case "list":
      await cmdList();
      break;
    case "show": {
      const id = argv[3];
      if (!id) {
        console.error("Usage: npm run lab -- show <session-id>");
        process.exit(1);
      }
      await cmdShow(id);
      break;
    }
    case "status":
      await cmdStatus();
      break;
    case "bootstrap":
      await cmdBootstrap();
      break;
    case "complete": {
      const stage = argv[3] as "extract" | "synthesize" | "draft";
      const sessionId = String(args.session ?? "");
      const jsonPath = String(args.json ?? "");
      if (!["extract", "synthesize", "draft"].includes(stage) || !sessionId || !jsonPath) {
        console.error("Usage: npm run lab -- complete <extract|synthesize|draft> --session <id> --json <file>");
        process.exit(1);
      }
      await cmdComplete(stage, sessionId, jsonPath);
      break;
    }
    case "prompt": {
      const workflow = argv[3] as WorkflowName;
      const sessionId = String(args.session ?? "");
      const valid: WorkflowName[] = ["extract", "synthesize", "draft", "self-critique"];
      if (!valid.includes(workflow) || !sessionId) {
        console.error("Usage: npm run lab -- prompt <extract|synthesize|draft|self-critique> --session <id>");
        process.exit(1);
      }
      await cmdPrompt(workflow, sessionId);
      break;
    }
    default:
      usage();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
