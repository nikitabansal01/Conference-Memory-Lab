# Product Direction — Thought Partner Workspace

## North star

After any event, the user should quickly know:

1. **What mattered**
2. **What to think deeper about**
3. **What to do next**

Opening the app should feel like:

> "I know what mattered. I know what to think about. I know what to do next."

Not:

> "I have a dashboard of notes."

## Core promise

Conference Memory Lab is a **thought partner** that compounds event learnings into **action** — current projects, new ideas, meaningful network expansion — not a notes archive or analytics dashboard.

| Job | Outcome |
|-----|---------|
| **Remember** | Capture what mattered (people, claims, themes) |
| **Think** | Challenge assumptions, connect to your lens and active work |
| **Create** | Turn insights into drafts (content, follow-ups) when ready |
| **Connect** | Expand network with context, not volume |
| **Review** | Ground, evaluate, approve — earn trust |

## Vocabulary (use consistently in UI)

| Term | Meaning |
|------|---------|
| **Remember** | L0 extract — memory graph (people, claims, themes) |
| **Think** | L1 synthesize — thought partner (challenges, project links, "what changed my thinking?") |
| **Create** | L2 draft — content angles, LinkedIn drafts, follow-up messages |
| **Connect** | L5+ — contextual outreach, speaker graph, meaningful follow-through |
| **Review** | L3 eval + approve — human judgment trains the system |

Trust ladder levels (Observer → Autopilot) stay under the hood; user-facing language prefers the five verbs above.

## Home screen (revised)

**Prioritize action, not stats.**

### Hero: Latest event + best next action

```
┌─────────────────────────────────────────────────┐
│  SF LLM Eval Mixer · 2 days ago                 │
│  "Evaluating agentic workflows — your wedge"    │
│                                                 │
│  [ Review follow-up for Jordan ]  ← primary CTA │
└─────────────────────────────────────────────────┘
```

### Action Center (replaces vanity metrics)

Dynamic queue of **one best next step** items:

| Action type | Example |
|-------------|---------|
| Finish draft | Approve or edit LinkedIn post |
| Follow up | Send message to Alex (ex-FDA, consent audit trails) |
| Apply to project | Link claim to active project at Frontera |
| Review claim | Challenge assumption #2 — still agree? |
| Complete profile | Upload resume or write bio (onboarding) |
| Log first event | Empty state CTA |

Stats (events, XP) move to secondary position or Settings — not hero.

### Your Lens (renamed from Profile Lens)

Shows **how the AI interprets your expertise** — not a tag cloud.

- Current role + domains
- "Right now I'm optimizing for: outcome-centered evals, regulated workflows"
- CTA if incomplete: Upload resume · Write bio · Paste 2 LinkedIn posts

### Trust (de-emphasize XP)

Show **unlocked capabilities**, not XP grind:

> Unlocked: Remember, Think, Create drafts  
> Next: Review & export (approve 1 draft to unlock)

Locked integrations explain trust:

> "Unlocked after you've reviewed drafts — so the system learns your preferences."

Not paywall language.

## Session detail

### Tabs (renamed to match vocabulary)

| Tab | Was | Focus |
|-----|-----|-------|
| **Remember** | Memory | People, claims, themes, citations |
| **Think** | Thought partner | **Strongest tab** — see below |
| **Create** | Drafts | Content angles + platform drafts |
| **Connect** | Follow-ups | Per-person messages with context |
| **Review** | Eval | Scores, overrides, reasoning trace |

### Knowledge graph (session-scoped, not on Home)

Lives inside **Remember** or **Think** as an expandable view:

```
Speaker → Claim → Theme → Project → Content
```

Example path:

`Dr. Maya Chen → "evals as product surface" → Eval ownership → Frontera LLM eval framework → LinkedIn draft angle`

### Think tab (hero of session)

Must include:

1. **What mattered** — top 3 claims/themes for this user specifically
2. **Assumption challenges** — questions to sit with
3. **Project connections** — "This extends your work on ___" / "Apply to Frontera eval framework"
4. **What changed my thinking?** — user-editable reflection field (new data model: `userReflection`)
5. **Content angles** — non-obvious insights, not recap

## New data concepts (to build)

| Entity | Purpose |
|--------|---------|
| `Project` | User's active work (e.g. Frontera eval framework, Conference Memory Lab) |
| `InsightApplication` | Link claim/theme → project → suggested action |
| `ActionItem` | Typed next step: `follow_up`, `draft`, `apply_insight`, `review_claim`, `reflect` |
| `userReflection` | "What changed my thinking?" per session |

## Empty states (push progress)

| State | CTA |
|-------|-----|
| No profile | Complete Your Lens — resume or bio |
| No events | Log your first event |
| Event ingested only | Run Remember (extract) |
| Extracted, no think | Run Think — see what mattered for you |
| Drafted, not reviewed | Review your first draft (+50 XP) |

## What stays the same

- Trust ladder L0–L6 (capabilities framing in UI, XP secondary)
- Local-first privacy
- Session pipeline: extract → synthesize → draft → self-critique
- Reasoning trace + eval rubrics
- No emojis, conversational voice, plain English
- Phased integrations (LinkedIn L4, Luma L5)

## Design test (every screen)

Ask: Does this help the user know **what mattered**, **what to think about**, or **what to do next**?

If it's only showing data without a clear action, demote or remove it.

## Build priority (aligned to this direction)

1. **Home redesign** — latest event + Action Center + Your Lens
2. **Think tab enrichment** — project connections, reflection, "what mattered"
3. **Onboarding** — Your Lens CTA (resume / bio)
4. **New Event wizard** — log event, link, photos
5. **Action items API** — compute best next action from session state
6. **Knowledge graph view** — session detail only
7. Settings + integrations (trust-framed)
