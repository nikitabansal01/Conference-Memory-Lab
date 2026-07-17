# Quality rubric — what makes THIS gold better than a generic AI extract

Use this to judge Remember / Think / Create output for events like this panel.

## What gold does (patterns to require)

1. **Defines the shared vocabulary first**  
   Evals / harness / traces are not fluff — they are the shared language of the room. Gold opens with definitions so later claims land.

2. **Named people + named ideas**  
   Not "a panelist said evals matter." Instead: **Ankur's super dumb rule**, **Zhen's VibeBench / hard features**, **Sylvain's HITL + meta signals**, **Dima's secret failures / turn-count regression**.

3. **Sharp, portable heuristics** (not summaries)  
   Examples of gold-grade lines:
   - You need evals when fixing one user breaks another (whack-a-mole).
   - Automate **trace → dataset** or you're screwed.
   - Coding agents have reversibility; knowledge-work agents don't (can't unsend email).
   - Models mask failures — watch secondary signals (turns 50→55).
   - Start harness (~90/100); only then weights.
   - If you can't reproduce it in an eval, don't jump to fancy RL.

4. **Company-specific playbooks, then synthesis**  
   Gold structures by company (Braintrust / Replit / Composio / Fireworks), then compresses into **Key Takeaways** that a PM can act on.

5. **Tension / debate kept alive**  
   Gold keeps the Ankur vs Sylvain disagreement on local maxima / human intuition. Generic AI flattens debates into consensus mush.

6. **PM-actionable closing**  
   Gold ends with: landscape changes every 3 months; PMF drives eval quality; most teams still on harness low-hanging fruit; self-improve loop = traces → harness → offline → A/B.

## What bad / generic AI usually does (reject)

- "The panel discussed the importance of evaluating AI agents…"
- Speaker intros as takeaways ("Ankur works at Braintrust…")
- Slide-title claims with no portable rule
- Mixing all speakers into one undifferentiated blob
- Missing the **trace → dataset** and **whack-a-mole** heuristics
- LinkedIn draft that starts with "I attended a great panel at Notion HQ…"
- LinkedIn draft that lists companies without a **wedge** (one opinionated claim)

## For LinkedIn drafts from this event (gold bar)

See `gold-linkedin.md` for the canonical example. Patterns to require:

1. **Opens with a belief shift**, not the event  
   "I used to think X… The more I learn, Y…" — not "I attended a panel at Notion…"
2. **One framing wedge**  
   Here: evals = confidence in the *entire system*, not good/bad model score.
3. **Traces as inspectability**, not jargon dump  
   Concrete questions: right tool? memory? recovery? user goal?
4. **Structure that teaches**  
   3 evaluation modes (deterministic / LLM-as-judge / HITL) with short bullets — scannable.
5. **Where it matters for her lens**  
   PMF + data, regulated industries, clear definition of "good".
6. **Practical closer**  
   "If your eval can't reproduce a production issue… it's a clue. Start simple."
7. **No event name / panelist name spam** unless a named heuristic is the point  
   This gold post almost never name-drops the panel — it distills.

Reject: recap openers, "excited to learn from industry experts," company laundry lists, emoji, generic CTA.

## Scoring (1–5) against gold

| Dimension | 5 looks like | 1 looks like |
|-----------|--------------|--------------|
| Non-obvious | Portable heuristics + named tensions | Recap / definitions only |
| Grounding | Traceable to transcript or raw notes | Invented or over-smoothed |
| Structure | Definitions → breaks → playbooks → wedge | Flat bullet dump |
| Voice (for drafts) | Sounds like Nikita's posts | Generic LinkedIn AI |

## Input strategy note

- **Raw notes** alone are sparse and miss structure — gold used **transcript + judgment**.
- Remember for this product should prefer: transcript (if present) + raw notes + lens, not notes-only when a transcript exists.
