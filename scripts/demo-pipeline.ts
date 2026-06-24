#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadLocalEnv } from "../src/lib/env.js";

loadLocalEnv();

import { createSession } from "../src/lib/session.js";
import { loadProgress, saveProgress, saveSession, loadProfileOrExample } from "../src/lib/storage.js";
import { runSessionWorkflow } from "../src/lib/run-workflow.js";
import { getDevUserId } from "../src/lib/auth.js";
import { isLlmConfigured } from "../src/lib/llm.js";
import { ROOT } from "../src/lib/storage.js";

const USER_ID = getDevUserId();
const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  if (!isLlmConfigured()) {
    console.error("OPENAI_API_KEY not loaded. Add it to .env.local and retry.");
    process.exit(1);
  }

  const notes = await readFile(join(ROOT, "examples/sample-event-notes.md"), "utf-8");
  const progress = await loadProgress(USER_ID);
  await loadProfileOrExample(USER_ID);

  const { session, progress: afterCreate } = createSession({
    title: "SF LLM Eval Mixer",
    eventType: "mixer",
    rawNotes: notes,
    attendanceIntent: "Find eval insights for regulated healthcare AI and agentic workflows.",
    userProgress: progress,
  });

  let current = { ...session, userId: USER_ID };
  await saveSession(current, USER_ID);
  await saveProgress(afterCreate, USER_ID);

  console.log("\nConference Memory Lab — full pipeline demo\n");
  console.log(`Session: ${current.id}`);
  console.log(`Open UI: http://localhost:${PORT}/  → open this event from sidebar\n`);

  const steps = ["extract", "synthesize", "draft", "self-critique"] as const;
  const labels = ["Remember", "Think", "Create", "Review"];

  for (let i = 0; i < steps.length; i++) {
    const workflow = steps[i];
    process.stdout.write(`${labels[i]} (${workflow})… `);
    const result = await runSessionWorkflow(workflow, current, USER_ID);
    current = result.session;
    console.log(`done · stage=${current.stage} · +${result.xpAwarded} XP`);
  }

  console.log("\n--- Results ---");
  console.log(`People: ${current.people.length}`);
  console.log(`Key takeaways: ${current.claims.filter((c) => c.text?.trim()).length}`);
  console.log(`Themes: ${current.themes.length}`);
  console.log(`Challenges: ${current.assumptionChallenges.length}`);
  console.log(`Drafts: ${current.contentDrafts.length}`);
  if (current.evalScores) {
    const e = current.evalScores;
    console.log(
      `Scores — grounding ${e.grounding}, voice ${e.voice}, lens ${e.expertiseLens}, non-obvious ${e.nonObviousness}`
    );
  }
  const mattered =
    current.matteredLine ||
    current.claims.find((c) => c.text?.includes("[non-obvious]"))?.text ||
    current.themes[0]?.label;
  if (mattered) {
    console.log(`\nWhat mattered: ${mattered.replace(/\[non-obvious\]\s*/i, "").slice(0, 120)}…`);
  }
  console.log(`\nDone. Refresh http://localhost:${PORT} and open the event to explore all 5 tabs.\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
