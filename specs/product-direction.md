# Product Direction — Thought Partner Workspace

Product spec from an **AI product manager** perspective: what v0 proves, what v1 must feel like, and how every screen earns trust.

---

## North star

After any event, the user should quickly know:

1. **What mattered**
2. **What to think deeper about**
3. **What to do next**

Opening the app should feel like:

> "I know what mattered. I know what to think about. I know what to do next."

Not:

> "I have a dashboard of notes."

---

## v0 vs v1 — product definition

### v0 (shipped) — *Prove the thought partner loop*

**Hypothesis:** A user can log a real networking event and get **grounded memory, lens-aware thinking, and a reviewable draft** entirely in-app — without copy-pasting JSON or opening Cursor.

| Pillar | v0 delivery |
|--------|-------------|
| **Memory** | Attend tab → notes, event link, media → **Remember** extracts people + **key takeaways** + themes |
| **Thought partner** | **Think** tab → assumption challenges, profile connections, editable mattered line |
| **Action** | **Create** tab → angles, LinkedIn draft, follow-ups; **Review** tab → eval scores |
| **Trust** | L0–L2 unlock within first event; capabilities framed in UI, XP secondary |
| **AI execution** | Server-side LLM; prompts in `workflows/`; trust gates on every run |

**v0 UX principle:** Every loop step has a **Run** button and visible output. Remember can be **re-run** after extraction. Think output is **editable and saveable**.

**What v0 intentionally defers:** Export, draft approval → profile learning, project entities, knowledge graph, OAuth.

---

### v1 (next) — *Habit + compounding quality*

**Hypothesis:** Users return after every event because the product **learns their voice** and connects learnings to **active work** — not because the AI is clever once.

| Pillar | v1 target |
|--------|-----------|
| **Memory** | Source citations visible on every takeaway; confidence signals |
| **Thought partner** | Project connections, “What changed my thinking?” reflection, re-run Think |
| **Action** | L3 Editor — approve draft, export, eval overrides feed Your Lens |
| **Trust** | Clear “graduate to Review & export” moment; L4 integrations still earned |
| **AI execution** | Eval feedback loop; prompt iteration with measurable eval deltas |

**v1 UX principle:** The user **co-authors** Think output; the system **remembers** their corrections on the next event.

**v1 exit test:** New user completes onboarding + first event without README. Third event draft needs less editing than the first.

---

## Core promise

Conference Memory Lab is a **thought partner** that compounds event learnings into **action** — current projects, new ideas, meaningful network expansion — not a notes archive or analytics dashboard.

| Job | Outcome | v0 | v1 |
|-----|---------|----|----|
| **Remember** | Capture what mattered (people, key takeaways, themes) | ✅ In-app | Citations + confidence UI |
| **Think** | Challenge assumptions, connect to lens and work | ✅ Editable | + reflection, projects, re-run |
| **Create** | Drafts when ready (content, follow-ups) | ✅ In-app | + approve flow |
| **Connect** | Contextual outreach | Partial (follow-up drafts) | Connect tab polish |
| **Review** | Ground, evaluate, approve — earn trust | ✅ Scores | + overrides → profile |

---

## Vocabulary (use consistently in UI)

| Term | Meaning | Data model |
|------|---------|------------|
| **Attend** | Show up — log event, notes, link, media | `ingested` stage |
| **Remember** | L0 extract — memory graph | `claims` → shown as **Key takeaways** |
| **Think** | L1 synthesize — thought partner | `assumptionChallenges`, `themes`, `matteredLine` |
| **Create** | L2 draft — angles, posts, follow-ups | `contentAngles`, `contentDrafts`, `followUpDrafts` |
| **Connect** | L5+ — contextual outreach, speaker graph | Future tab emphasis |
| **Review** | L3 eval + approve | `evalScores` |

Trust ladder levels (Observer → Autopilot) stay under the hood; user-facing language prefers the verbs above.

**Naming decision (v0):** Step 1 shows **Key takeaways**, not “Claims.” The underlying field remains `claims` for pipeline compatibility; user language should never feel like a legal or fact-checking product.

---

## Home screen

**Prioritize action, not stats.** v0 ships Action Center, Content Hub, learning streak, and capacity sidebar.

### Hero: Latest event + best next action

```
┌─────────────────────────────────────────────────┐
│  SF LLM Eval Mixer · 2 days ago                 │
│  "Evaluating agentic workflows — your wedge"    │
│                                                 │
│  [ Run Think ]  or  [ Review draft ]  ← primary │
└─────────────────────────────────────────────────┘
```

### Action Center

Dynamic queue of **one best next step** items:

| Action type | Example | v0 |
|-------------|---------|-----|
| Run Remember | Extract key takeaways from notes | ✅ |
| Run Think | Connect learnings to Your Lens | ✅ |
| Finish draft | Run Create or edit in Think | ✅ |
| Follow up | Send message to Alex | Partial — draft exists, no send |
| Complete profile | Upload resume or write bio | ✅ modal |
| Log first event | Empty state CTA | ✅ |

Stats (events, XP) are secondary — capacity arc and streak support habit without hero vanity metrics.

### Your Lens

Shows **how the AI interprets your expertise**:

- Current role + domains
- “Right now I'm optimizing for: …”
- CTA if incomplete: complete lens modal

### Trust (de-emphasize XP)

Show **unlocked capabilities**:

> Unlocked: Remember, Think, Create  
> Next: Review & export (approve 1 draft to unlock)

Locked integrations explain trust — not paywall language.

---

## Session detail — tabs (v0)

| Tab | Focus | v0 status |
|-----|-------|-----------|
| **Attend** | Notes, media, event context, Remember, extracted memory | ✅ Shipped |
| **Think** | Mattered line, challenges, profile connections, angles — **editable** | ✅ Shipped |
| **Create** | Content angles, platform drafts, follow-ups | ✅ Shipped |
| **Review** | Eval scores + notes from self-critique | ✅ Shipped |
| **Connect** | Per-person outreach (future hero tab) | Follow-ups live under Create |

### Attend — Remember output (v0)

**Extracted memory** section (expanded by default):

- **People** — speakers and connections
- **Key takeaways** — grounded statements from notes (not slide titles)
- **Re-run Remember** — always visible; re-extracts after note edits

Empty takeaways show a clear message: add notes, re-run Remember.

### Think tab — hero of session (v0 shipped, v1 enriched)

**Shipped in v0:**

1. **What mattered for you** — editable textarea (`matteredLine`); falls back to best non-obvious takeaway
2. **Think deeper** — editable assumption challenges (question + why it matters)
3. **Apply to your work** — editable theme + profile connection (all themes, not only connected ones)
4. **Angles** — editable title + non-obvious insight
5. **Save edits** — persists via PATCH; sample sessions read-only

**v1 additions:**

6. **What changed my thinking?** — user reflection field (`userReflection`)
7. **Project connections** — “Apply to [Project X]” with `InsightApplication` links
8. **Re-run Think** — same affordance as Remember
9. **Knowledge graph** — expandable: Speaker → Takeaway → Theme → Project → Draft

### Knowledge graph (v1 — session-scoped)

Lives inside Remember or Think as an expandable view:

```
Speaker → Key takeaway → Theme → Project → Content
```

Example:

`Dr. Maya Chen → "evals as product surface" → Eval ownership → Frontera eval framework → LinkedIn draft angle`

---

## AI product principles

These govern every workflow and screen:

1. **Grounding before cleverness** — Remember must cite notes/event context; empty takeaways are a product bug, not user error
2. **Personalization starts at Think** — profile/resume excluded from Remember (L0 privacy)
3. **Human co-authorship** — editable Think zone; user corrections are first-class data
4. **Trust earns automation** — no OAuth, auto-publish, or auto-send until review history exists
5. **Action over analytics** — every screen points to a next step
6. **Transparency** — reasoning trace in workflows: sources → takeaways → insights → drafts

---

## Data concepts

| Entity | Purpose | v0 | v1 |
|--------|---------|----|----|
| `EventSession` | Full event memory + pipeline state | ✅ | — |
| `Claim` | Structured takeaway with sources | ✅ (UI: key takeaway) | Citation UI |
| `matteredLine` | User-editable “what mattered” | ✅ | — |
| `Project` | User's active work | — | ✅ |
| `InsightApplication` | Takeaway/theme → project → action | — | ✅ |
| `ActionItem` | Typed next step | ✅ in `actions.ts` | Richer types |
| `userReflection` | “What changed my thinking?” | — | ✅ |

---

## Empty states (push progress)

| State | CTA | v0 |
|-------|-----|-----|
| No profile | Complete Your Lens | ✅ |
| No events | Log your first event | ✅ |
| Event ingested only | Run Remember | ✅ |
| Extracted, no think | Run Think | ✅ |
| Drafted, not reviewed | Run Review | ✅ |
| Reviewed, not exported | Export draft (v1) | — |

---

## Onboarding (v0)

Five-step walkthrough on first dashboard load — see [onboarding-walkthrough.md](./onboarding-walkthrough.md):

1. Your Unique Lens
2. Capacity levels (L1–L6)
3. Add an event
4. Five-step loop preview
5. Connect Apps preview (trust-framed, locked)

**v1 gap:** Tour gets user to the door; first **successful Remember → Think** without confusion is the real activation metric.

---

## What stays the same

- Trust ladder L0–L6 (capabilities in UI, XP secondary)
- Privacy-first framing — local dev without cloud; production with user-scoped storage
- Session pipeline: extract → synthesize → draft → self-critique
- Reasoning trace + eval rubrics
- No emojis; conversational voice; plain English
- Phased integrations (LinkedIn L4, deep network L5+)

---

## Build priority (v1 backlog)

Ordered by AI PM leverage — **quality loop and habit before integrations**:

1. **Eval override → profile** — close the learning loop
2. **L3 Editor** — approve + export + unlock messaging
3. **Think reflection + project connections** — thought partner depth
4. **Takeaway citations UI** — trust in memory
5. **Re-run Think** — parity with Remember
6. **Knowledge graph** — session detail only
7. **Onboarding → activation** — first event without docs
8. Settings + Connect Apps (trust-framed, L4+)

---

## Design test (every screen)

Ask: Does this help the user know **what mattered**, **what to think about**, or **what to do next**?

If it's only showing data without a clear action, demote or remove it.

---

## Related docs

| Doc | Focus |
|-----|-------|
| [architecture-and-roadmap.md](./architecture-and-roadmap.md) | System design, v0/v1 technical roadmap |
| [level-0.md](./level-0.md) | L0–L2 eval thresholds |
| [onboarding-walkthrough.md](./onboarding-walkthrough.md) | First-run tour |
