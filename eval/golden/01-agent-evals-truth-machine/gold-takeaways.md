# Gold takeaways (user Notion — target quality)

> This is the bar. Remember / Think output should feel closer to this than to a panel recap.

## Overview

- Panel discussion on AI agent evals hosted at Notion's SF HQ
- Panelists: **Ankur** (Braintrust), **Zhen Li** (Replit, engineering lead and creator of the first version of Replit Agent), **Dima** (Fireworks AI), **Sylvain** (Composio, co-founder)

## Key Definitions

- **Evals** = the tests that measure whether an AI agent is getting better or worse (accuracy, safety, task success, latency, etc.)
- **Harness** = the system around the AI that you change to improve performance (prompts, workflows, tool selection, memory, routing, guardrails, etc.)
- **Traces** = detailed logs of everything that happened during an AI interaction — inputs, reasoning steps, tool calls, retrieved context, outputs, errors, latency, and outcomes

## Where Agents Break & When You Need Evals

- Agents break in two broad categories: **visible/system errors** (easy to capture offline) and **long-tail errors** (e.g., 1% failure rates for specific user workflows)
- **Ankur's "super dumb rule"**: you need evals when fixing one user's problem breaks another's — the classic whack-a-mole moment
  - In traditional software you incrementally approach correctness; in AI, there is no such definitive visible signal
  - The further you get from a human manually checking the app, the more automation (evals) you need
- **Replit (Zhen Li)**: in the early days, the entire AI team *was* the eval — they ran the harness and watched what broke; this doesn't scale
- **Composio (Sylvain)**: knowledge work agents have no built-in verifiability — a bad email cannot be unsent; tail-end edge cases (e.g., emailing the wrong customer) are extremely high-stakes
- **Fireworks (Dima)**: smarter agentic models now *mask* failures — overall eval scores may stay stable while subtle regressions (e.g., number of turns increasing from 50 to 55) go unnoticed
  - Infrastructure-level errors (malformed JSON, wrong tool calls) are also a surprisingly common failure source

## How to Build Evals — Company Examples

### Braintrust (Ankur)

- Built an internal agent called **Loop** to help users query Braintrust data via SQL
- Key mistake to avoid: sitting in a room and hand-crafting 40 example cases — you'll only finish 10, and real production failures will be different
- **Critical insight**: the only way to build good evals for complex agents is to **automate the path from trace → dataset**; without this, you are "screwed"
- Pipeline: find traces where queries error or are slow → cluster them → automatically reproduce with synthetic data → use as eval/RL environment

### Replit (Zhen Li)

- Tier 1 — **Offline evals**: built **VibeBench**, which uses a computer-use agent to interact with the deployed product, click every button and feature, and check if it works
- Tier 2 — **Long-tail / online monitoring**: used Braintrust to cluster production logs and surface rare, hard-to-reproduce failures
- Evals must be **end-to-end and close to the actual user experience** — not isolated unit checks
- Public benchmarks like SWE-bench and TerminalBench don't reflect Replit's actual user problem distribution (e.g., users asking to build Minecraft or GTA)
- Showed real user traces to researchers; researchers said they had never seen such "chaotic" traces
- Built a subset of evals called **"hard features"**: take an existing app and add the hardest possible feature on top of it, then check if the agent handles it
- Evals must **evolve continuously** as user needs, models, and the harness change

### Composio (Sylvain)

- Three eval approaches: deterministic (limited applicability), LLM-as-judge (increasingly hard to use as tasks grow more complex), and **human-in-the-loop (HITL)**
- HITL requires excellent UX to collect structured feedback; group feedback into classes (good vs. bad) before feeding it into workflows
- Use product interaction signals (e.g., latency spikes — "this task usually takes 15 steps, why did it take way more?") as **meta signals** to construct offline evals

### Fireworks (Dima)

- Use-case-specific evals matter far more than general academic benchmarks; "models fail secretly — overall evals may still work" if you rely only on general evals
- Eval harness should invoke **real deployed services** as faithfully as possible, not just mocked environments

## Self-Improving Agents & the A/B Testing Loop

- **Three-step loop (Zhen Li)**:
  1. Let the agent read a batch of traces and propose harness changes
  2. Evaluate the proposed harness change **offline** first
  3. If offline evals pass, promote to **online A/B test**; repeat continuously
- Analogy: just like model training learns from tokens and distills knowledge into weights, self-evolving agents learn from **traces** and distill knowledge into the **harness** (prompts, skills, tools)
- Zhen Li currently lets the agent *propose* A/B tests; a human still clicks "ship" — one layer of human-in-the-loop remains
- **Debate — local maxima**: Sylvain argued self-improvement gets stuck without human intuition to identify missing context; Ankur disagreed, saying model stagnation is an engineering problem (missing context), not a model intelligence problem
- **Sylvain's framework**: model-continued learning ≠ harness-continued learning — the right approach is use-case-dependent and a function of the intelligence required to solve the problem
- Throwing more compute at harness search can work but is very inefficient today; gradient-based optimization (RL on weights) is the more efficient path but carries safety risks

## Model Weights vs. Harness — When to Go Deeper

- **Start with harness**: changing prompts/tools is the fastest, cheapest lever and can get you to ~90/100
- **Move to weight optimization** when: you have enough scale, clear evals, and cost savings become a top-3 priority; fine-tuning lets the model internalize your harness so you don't explain it from scratch every time
- Analogy: Anthropic built Claude Code to control their own harness and close the optimization loop
- **Composio**: not yet fine-tuning because they don't yet have enough data, and frontier open-source models are improving rapidly anyway
- **Ankur's heuristic**: if you can't reproduce your problem in an eval, focus on that first; don't skip to fancy techniques — "99% of the time a dumb harness trick will fix it"

## Building Customer Trust

- **Braintrust**: value = time from opening the UI to seeing a trace that represents a fixable problem
- **Replit**: trust builds progressively — first experience → users running their businesses on the platform → treating the agent as a full-time engineer
- **Fireworks**: consistent delivery across the quality/speed/cost triangle; owning open-source models provides reliability guarantees (no silent model swaps)
- Public eval numbers have lost credibility with sophisticated buyers — "anyone can spend a month and top any eval"; proof is in letting customers try the product
- Enterprise customers increasingly skip benchmark discussions and prefer hackathons/hands-on trials
- Two enterprise archetypes: (1) AI-as-core-product companies (strong eval muscle), and (2) internal process automation buyers (often have no product analytics mindset at all — a harder, more open problem)

## Key Takeaways (compressed wedge)

- The eval/agent landscape changes roughly **every three months**; anyone can start at any time and prior knowledge may be obsolete in six months
- The biggest determinant of eval quality is **product-market fit** — it dictates data volume and signal quality
- Most agent companies today are still in the **low-hanging-fruit harness iteration** phase — pursue that aggressively before jumping to weight optimization
- The self-improving agent loop (traces → harness change → offline eval → A/B test → repeat) is the most promising path to continuous, systematic improvement
