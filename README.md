# Conference Memory Lab

Turn networking events — from 2-hour mixers to multi-day conferences — into **retained memory**, **contextual follow-ups**, and **exclusive thought-partner content** grounded in what you actually learned.

Not a generic conference co-pilot. An **interaction memory system** with a trust-graduated agent and built-in evaluation.

## What it does

| Layer | Job |
|-------|-----|
| **Remember** | Capture people, conversations, talks, and non-obvious insights |
| **Think** | Challenge assumptions, compare against your expertise, surface what others miss |
| **Connect** | Draft personalized LinkedIn follow-ups with real context |
| **Share** | Generate exclusive content angles (LinkedIn, thread, newsletter) — publish only when you unlock higher trust levels |

## Trust ladder (gamified)

| Level | Name | Unlocks |
|-------|------|---------|
| **L0** | Observer | Import notes & screenshots, extract claims |
| **L1** | Synthesizer | Compare learnings vs your profile, cluster themes |
| **L2** | Drafter | Thought-partner angles, follow-up drafts, content drafts |
| **L3** | Editor | Multi-platform formats, eval scorecard, clipboard export |
| **L4** | Publisher | One-platform OAuth, review queue, scheduled publish |
| **L5** | Networker | Luma/speaker parsing, connection message drafts |
| **L6** | Autopilot | Multi-platform schedule, audit log, rollback |

Start at **L0**. Every completed session earns XP and unlocks the next level.

## Quick start

```bash
npm install
cp profile/profile.example.json profile/profile.json
# Edit profile/profile.json with your expertise and voice examples

npm run lab -- new --title "SF LLM Eval Meetup" --notes notes.txt
npm run lab -- status
npm run lab -- prompt extract --session <id>
```

Workflow prompts are assembled for you to run in Cursor (or via Cursor SDK at L3+). The CLI manages sessions, trust levels, and artifacts.

## Project structure

```
profile/          Your expertise corpus and voice examples
workflows/        Agent workflow prompts (extract → synthesize → draft)
eval/rubrics/     Scoring criteria for grounding, voice, expertise
src/models/       Event, Person, Interaction, Claim, ContentAngle
src/trust/        Level gates and permitted actions
src/gamification/ XP, milestones, progress
data/sessions/    Local session artifacts (gitignored)
specs/            Level specs and design docs
```

## Design principles

1. **Transparency** — Every output shows reasoning: sources → claims → angles → drafts
2. **Trust earns access** — Draft-only until you explicitly unlock publish/outreach
3. **Evaluation is first-class** — Voice match, grounding, and expertise lens scored from day one
4. **Event-agnostic** — Same pipeline for a 2-hour mixer and a 3-day conference

See [specs/level-0.md](specs/level-0.md) for the MVP spec.
