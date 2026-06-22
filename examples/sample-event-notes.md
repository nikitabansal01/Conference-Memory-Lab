# Sample event notes — SF LLM Eval Meetup (2-hour mixer)

Event: Frontier AI Evaluation frameworks — informal mixer after panel
Location: SoMa, San Francisco
Luma: https://lu.ma/example (placeholder)

## Panel highlights (screenshot: slide on "evals as product surface")

- Speaker: Dr. Maya Chen, Head of Evals @ MedAI — "Evals aren't a gate before launch; they're the product surface clinicians trust."
- Another speaker argued benchmark leaderboard chasing is misleading for healthcare — need task-specific failure modes.
- Audience question: who owns eval when PM and ML disagree? No clear answer.

## People I met

1. **Jordan Lee** — PM at a Series B health startup, building ambient scribe. Met at coffee line.
   - Talked about their eval rubric for clinical note accuracy vs physician edit rate.
   - They're hiring PMs who understand regulated workflows.
   - Connected on LinkedIn already — no message yet.

2. **Alex Rivera** — ML engineer, ex-FDA. Random intro via mutual friend Sarah.
   - Strong opinion: most "human-in-the-loop" demos ignore consent audit trails.
   - Mentioned open problem: eval datasets that reflect diverse patient populations.

3. **Sarah Kim** — Organizer, runs monthly SF health-AI mixers.
   - Said next event is on agentic workflows in hospitals — want to speak?

## My raw thoughts

- The "evals as product surface" framing is less obvious than "evals before ship" — good LinkedIn angle for PM audience in regulated industries.
- Jordan's edit-rate metric is more honest than BLEU-style scores — want to explore for future project.
- Alex's consent audit trail point = gap I keep seeing in demos. Challenge: do we over-index on model accuracy vs workflow trust?
- Should follow up with Jordan about their rubric. Alex too — the FDA angle is rare.

## Less obvious takeaway

Everyone talked about model eval; almost nobody talked about **evaluating the agentic workflow** (tool calls, handoffs, escalation). That's my wedge.
