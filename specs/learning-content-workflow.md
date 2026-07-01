# Learning & Content Workflow — UX Design

How a user moves from **showing up at an event** to **personal insight** to **shareable content** — without feeling like they're managing a pipeline.

---

## Design intent

| Feeling we want | Feeling we avoid |
|-----------------|------------------|
| "I'm reflecting on what mattered" | "I'm filling out a form" |
| "The app knows what I should do next" | "Which tab do I click?" |
| "My lens makes this personal" | "Generic AI recap" |
| "I'll share when it's ready" | "Auto-posted without me" |

**North star:** After any event, the user knows what mattered, what to think about, and what to do next — in that order.

---

## Two mental lanes

Every session splits into two lanes the UI makes visible:

```
┌─────────────────────────────────────────────────────────────┐
│  LEARN (Attend → Think)     │  SHARE (Connect → Create → Review) │
│  Capture & reflect          │  Reach out & publish               │
└─────────────────────────────────────────────────────────────┘
```

| Lane | Steps | User mindset | Success signal |
|------|-------|--------------|----------------|
| **Learn** | Attend, Think | "What did I take away?" | `matteredLine` + themes saved |
| **Share** | Connect, Create, Review | "What do I do with this?" | Draft approved |

Users can jump between steps, but the **recommended next step** always follows Learn before Share.

---

## Step-by-step journey

### 1. Attend — Show up & capture

**Goal:** Get raw material in while memory is fresh.

**User does (in order):**
1. Set intent — *Why are you here?* (optional but primes thinking)
2. Add notes, transcript, or media
3. Run **Analyze key takeaways** (Remember)

**UI patterns:**
- Collapsible sections with preview text — scan without opening
- Primary CTA in step guide: "Analyze key takeaways"
- Checklist: Notes captured → Takeaways analyzed

**Empty state:** "Add notes or a transcript above, then pull out what mattered."

**Exit criteria:** At least one key takeaway extracted (`stage: extracted`).

---

### 2. Think — Go deeper

**Goal:** Turn takeaways into *your* insight — filtered through Unique Lens.

**User does (in order):**
1. Write **What mattered** — one sentence they'll carry forward
2. Run **Think** — generates questions, work links, angles
3. Edit and **Save** — co-author the synthesis

**UI patterns:**
- **Reflect** lane: What mattered, Questions to sit with
- **Apply** lane: Links to your work, Interesting angles (seeds for Create)
- Primary CTA: "Run Think" until synthesized; then "Save edits"

**Empty state:** "Complete key takeaway analysis on Attend first."

**Exit criteria:** Themes with profile connections saved (`stage: synthesized`).

---

### 3. Connect — Reach out

**Goal:** Follow up while conversations are still warm.

**User does:**
1. Review connection drafts (speakers, hosts, people from notes)
2. Copy personalized invitation messages

**UI patterns:**
- Grouped by Speakers / Hosts / People from notes
- Copy button per draft — no auto-send until L4+

**Exit criteria:** User has copied or skipped — not gated on stage.

---

### 4. Create — Draft & share

**Goal:** Turn Think themes into copy-paste-ready posts.

**User does (in order):**
1. Review themes from Think (shown as draft sources)
2. Run **Generate LinkedIn drafts**
3. Edit posts and follow-ups
4. **Save edits**

**UI patterns:**
- LinkedIn drafts are the hero — angles come from Think, not duplicated
- Each draft shows "Based on: [theme]"
- Primary CTA: "Generate LinkedIn drafts"

**Empty state:** "Add themes in Think first — drafts are built from those themes."

**Exit criteria:** At least one LinkedIn draft with body (`stage: drafted`).

---

### 5. Review — Approve before shipping

**Goal:** Ground drafts in sources; user approves before sharing.

**User does:**
1. Run **Review** — eval scores (grounding, voice, lens, non-obviousness)
2. Override scores if needed
3. Approve when ready

**UI patterns:**
- Scores with plain-English justifications
- Nothing publishes until explicit approval

**Exit criteria:** `stage: reviewed` — unlocks export and Connect Apps messaging.

---

## Navigation rules

| Trigger | Behavior |
|---------|----------|
| Open event (no tab specified) | Land on step matching `session.stage` |
| Home "Continue" action | Open event on action's tab |
| Loop step click | Switch tab; update progress indicator |
| Workflow completes | Auto-advance to next tab |
| Quest bar "Continue" | Run agent planner for next workflow step |

**Stage → default tab mapping:**

| Stage | Tab |
|-------|-----|
| `ingested` | Attend |
| `extracted` | Think |
| `synthesized` | Connect |
| `drafted` | Create |
| `reviewed` | Review |
| `published` | Review |

---

## Step guide component

Each panel shows a contextual guide card at the top:

```
┌──────────────────────────────────────────────────┐
│ LEARN · Step 2                                   │
│ Turn takeaways into insight through your lens    │
│                                                  │
│ ✓ Key takeaways analyzed                         │
│ ○ Run Think                                      │
│ ○ Save your edits                                │
│                                                  │
│              [ Run Think ]                       │
└──────────────────────────────────────────────────┘
```

- **Lane badge** (Learn / Share) orients the user
- **Checklist** shows sub-task progress
- **Primary CTA** duplicates the most important action for that step

---

## Content hub (cross-event)

After multiple events, **Content** hub groups post ideas by theme — not by event. User thinks in ideas, not event archives.

| View | Shows |
|------|-------|
| By idea | Theme → drafts underneath |
| By platform | LinkedIn, newsletter, etc. |

---

## Design test (every screen)

Ask:

1. Does this help the user **learn** from the event?
2. Does this help the user **create** content they're proud of?
3. Is there exactly **one obvious next action**?

If not, simplify.

---

## Related

- [product-direction.md](./product-direction.md) — vocabulary, v0/v1 scope
- [onboarding-walkthrough.md](./onboarding-walkthrough.md) — first-run tour
- `workflows/*.md` — AI agent prompts per step
