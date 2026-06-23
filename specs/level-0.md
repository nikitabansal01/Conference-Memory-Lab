# Level 0–2 MVP Spec

## Goal

Ship a usable **memory + thought partner** loop for networking events before any auto-publish or LinkedIn OAuth.

## User story

> After a 2-hour SF tech mixer, I paste rough notes and optionally upload screenshot descriptions. Conference Memory Lab extracts who I met, what I learned, challenges one assumption, surfaces a non-obvious insight aligned with my PM/HCD/healthcare/eval lens, and drafts a LinkedIn follow-up for one person — all with visible reasoning and citations.

## Inputs

| Input | Required | Format |
|-------|----------|--------|
| Event title | Yes | string |
| Event type | Yes | `mixer` \| `panel` \| `conference` \| `webinar` \| `other` |
| Raw notes | Yes | plain text or markdown file |
| Event link | **Recommended** — Luma, Eventbrite, Partiful, or conference website (stored at L0; parsed at L5) |
| Screenshot descriptions | No | text per image (OCR later) |
| People met | No | inline in notes or structured list |

## Outputs (L0–L2)

### L0 — Observer
- Structured **claims** with source citations (note line or screenshot ref)
- **People** and **speakers** extracted as entities
- **Themes** clustered from claims

### L1 — Synthesizer
- **Compare** new learnings vs `profile/profile.json` expertise
- Tag each theme: `reinforces` \| `extends` \| `contradicts` \| `new`
- **Assumption challenge** — 1–2 substantive questions back to user

### L2 — Drafter
- **Non-obvious insight** — one angle others at the event might miss, tied to user's lens
- **3 content angles** with rationale and predicted audience
- **Follow-up draft** for one selected connection (context-grounded)
- **LinkedIn draft** (copy-paste ready, not published)

## Eval (displayed on every L2 run)

| Dimension | Scale | Threshold to "pass" |
|-----------|-------|---------------------|
| Grounding | 0–100 | ≥ 80 — claims cited |
| Voice | 0–100 | ≥ 70 — matches profile examples |
| Expertise lens | 0–100 | ≥ 75 — PM/HCD/healthcare/eval visible |
| Non-obviousness | 0–100 | ≥ 65 — not restating slide titles |

Human override on any score trains future rubric examples in `profile/profile.json`.

## Trust gates

| Action | Min level |
|--------|-----------|
| Save session locally | L0 |
| Load profile comparison | L1 |
| Generate drafts | L2 |
| Export to clipboard file | L3 |
| OAuth / publish | L4 |
| Connection automation | L5 |

## XP rewards

| Action | XP |
|--------|-----|
| Complete ingest | 25 |
| Complete extract (L0) | 50 |
| Complete synthesize (L1) | 75 |
| Complete draft (L2) | 100 |
| Human approves a draft | 50 |
| Publish (L4+) | 150 |

Level thresholds: L1=100, L2=250, L3=500, L4=1000, L5=2000, L6=4000.

## Out of scope (MVP)

- Instagram, auto-publish, LinkedIn OAuth
- Audio transcription (integrate Otter/Fireflies later)
- Luma scraping (manual speaker list OK for now)

## Success criteria

After 3 real events:
- [ ] You can find any person/conversation within 30 seconds
- [ ] At least one draft per event is "send as-is" quality for follow-up or post
- [ ] Eval scores trend upward as profile corpus grows
