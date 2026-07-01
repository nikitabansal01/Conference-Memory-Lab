import type { EventSession } from "../../models/types.js";
import { runSessionWorkflow, type RunnableWorkflow } from "../run-workflow.js";
import { loadProgress } from "../storage.js";
import { isSafeAutoChainWorkflow, planNextAgentStep, type AgentStepPlan } from "./planner.js";

export interface AgentTraceEntry {
  at: string;
  action: "plan" | "run_workflow" | "complete";
  detail: string;
}

export interface AgentContinueResult {
  session: EventSession;
  trace: AgentTraceEntry[];
  xpAwarded: number;
  leveledUp: boolean;
  plan: AgentStepPlan;
  stoppedForApproval: boolean;
  stepsRun: number;
}

export interface AgentContinueOptions {
  approve?: RunnableWorkflow;
  /** Default 1. P1 chains Remember → Think when set to 2. Capped at 3. */
  maxSteps?: number;
}

const MAX_STEPS_CAP = 3;

export async function continueSession(
  session: EventSession,
  userId: string,
  opts?: AgentContinueOptions
): Promise<AgentContinueResult> {
  const progress = await loadProgress(userId);
  const maxSteps = Math.min(Math.max(opts?.maxSteps ?? 1, 1), MAX_STEPS_CAP);

  let current = session;
  let totalXp = 0;
  let leveledUp = false;
  let stoppedForApproval = false;
  let lastPlan = planNextAgentStep(current, progress.level, opts);
  const trace: AgentTraceEntry[] = [
    { at: new Date().toISOString(), action: "plan", detail: lastPlan.reason },
  ];
  let stepsRun = 0;

  for (let step = 0; step < maxSteps; step++) {
    const approve = step === 0 ? opts?.approve : undefined;
    const plan = planNextAgentStep(current, progress.level, { approve });
    lastPlan = plan;

    if (step > 0) {
      trace.push({ at: new Date().toISOString(), action: "plan", detail: plan.reason });
    }

    if (!plan.workflow) {
      stoppedForApproval = plan.requiresApproval;
      break;
    }

    trace.push({
      at: new Date().toISOString(),
      action: "run_workflow",
      detail: plan.workflow,
    });

    const result = await runSessionWorkflow(plan.workflow, current, userId);
    current = result.session;
    totalXp += result.xpAwarded;
    leveledUp = leveledUp || result.leveledUp;
    stepsRun += 1;

    trace.push({
      at: new Date().toISOString(),
      action: "complete",
      detail: `Advanced to ${result.session.stage}`,
    });

    if (step + 1 >= maxSteps) break;

    const nextPlan = planNextAgentStep(current, progress.level);
    if (
      !nextPlan.workflow ||
      nextPlan.requiresApproval ||
      !isSafeAutoChainWorkflow(plan.workflow) ||
      !isSafeAutoChainWorkflow(nextPlan.workflow)
    ) {
      if (nextPlan.requiresApproval) {
        lastPlan = nextPlan;
        stoppedForApproval = true;
        trace.push({ at: new Date().toISOString(), action: "plan", detail: nextPlan.reason });
      }
      break;
    }
  }

  return {
    session: current,
    trace,
    xpAwarded: totalXp,
    leveledUp,
    plan: lastPlan,
    stoppedForApproval,
    stepsRun,
  };
}
