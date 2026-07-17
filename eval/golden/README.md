# Golden datasets

Human-authored examples of *what good looks like* for Conference Memory Lab.

## How to add an event

```
eval/golden/NN-short-slug/
  meta.json
  raw-notes.md
  transcript.md          # optional but preferred for panels
  gold-takeaways.md      # Notion / polished notes — the bar
  gold-linkedin.md       # optional: a post you'd actually publish
  quality-rubric.md      # what to require / reject
```

## Current set

| ID | Event | Status |
|----|-------|--------|
| `01-agent-evals-truth-machine` | Agent Evals: The Truth Machine (Composio, Braintrust, Fireworks, Replit) @ Notion SF | takeaways ✅ · LinkedIn ✅ |

## Use

1. Diff model Remember/Think/Create output vs `gold-takeaways.md`
2. Update `workflows/01-extract.md` and `workflows/03-draft.md` to match the rubric
3. Prefer transcript + notes when both exist
