# Voice-matched LinkedIn draft — SF LLM Eval Mixer

Profile: `profile/profile.json` with real post corpus. Rules: no emojis, conversational tone, plain English over technical jargon.

---

Earlier this week I wrote about moving from response-centered to outcome-centered evals in consumer healthcare AI.

A 2-hour SF health-AI mixer this week pushed me one layer deeper.

Everyone in the room was debating model benchmarks and whether leaderboard chasing misleads healthcare teams. Fair. Those things matter.

But they are not enough.

Here's what almost nobody said out loud:

We still don't know how to evaluate the full agentic workflow — how tools get called, how handoffs happen, when to escalate — not just whether the model output looks right.

Dr. Maya Chen (MedAI) framed evals as "the product surface clinicians trust" — not a gate before launch. I keep turning that over.

Because between the user input and the model's response lives the reasoning. And in healthcare AI, that reasoning layer is where things quietly go wrong.

If the model scores well but the workflow breaks consent logging or audit trails — a gap an ex-FDA engineer I met kept flagging — did you pass eval?

That's not a guardrail problem. That's a reasoning problem.

The harder product question from that night kept coming back:

What happened after the answer?
- Did the product catch missing context?
- Did it know when not to answer?
- Did it escalate when risk was high?
- Did the eval reflect how clinicians actually work — or how ML teams wish they worked?

One PM I spoke with measures ambient scribe quality by physician edit rate, not BLEU. That's more honest. But it still doesn't answer whether the workflow earns trust in a regulated setting.

Consumer healthcare AI needs to move from response-centered evals to outcome-centered evals.

Not just: Did the model respond well?

But: Did the product help the person — and the clinician — reach the right next step?

What's the eval metric you trust beyond model accuracy?
