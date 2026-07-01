# Conference Memory Lab

A **thought partner workspace** that compounds networking event learnings into **action** — what mattered, what to think deeper about, and what to do next.

Not a notes dashboard. An interaction memory system that connects insights to your projects, your network, and your voice — with graduated trust and built-in evaluation.

## North star

After any event, you should quickly know:

1. **What mattered**
2. **What to think deeper about**
3. **What to do next**

## The loop

| Stage | Job |
|-------|-----|
| **Attend** | Show up — log event, notes, event page link |
| **Think** | What mattered for your lens; challenge assumptions |
| **Connect** | Follow up while fresh — often before you publish |
| **Create** | Draft post; tag people you connected with |
| **Review** | Grounding, voice, approve before sharing |

## Trust ladder

Capabilities unlock as you use the product — draft review before publish, integrations when the system has learned your preferences.

| Level | Name | Unlocks |
|-------|------|---------|
| **L0** | Observer | Remember — extract memory from notes & photos |
| **L1** | Synthesizer | Think — connect learnings to Your Lens |
| **L2** | Drafter | Create — angles, drafts, follow-ups |
| **L3** | Editor | Review & export — approve drafts, multi-format |
| **L4** | Publisher | LinkedIn OAuth, review queue |
| **L5** | Networker | Event link parsing, connection drafts |
| **L6** | Autopilot | Multi-platform schedule, audit log |

See [specs/architecture-and-roadmap.md](specs/architecture-and-roadmap.md) for **v0/v1** architecture, tech stack, and roadmap. See [specs/product-direction.md](specs/product-direction.md) for UX direction and the shipped vs next-milestone product scope.

## Quick start

```bash
npm install
cp profile/profile.example.json profile/profile.json
cp .env.example .env   # add OPENAI_API_KEY for in-app Remember / Think / Create / Review

npm run dev
# → http://localhost:3000
```

## Project structure

```
profile/          Your Lens — expertise, voice, resume
prompts/          User copy-paste prompts (lens import from ChatGPT/Claude)
workflows/        Agent prompts (Remember → Think → Create)
eval/rubrics/     Review scorecard
src/              Models, trust, CLI, local server
specs/            Product direction + level specs
```

## Principles

1. **Action over analytics** — every screen points to a next step
2. **Transparency** — reasoning trace: sources → claims → insights → drafts
3. **Trust earns access** — integrations unlock after reviewed drafts, not day one
4. **Your Lens** — the AI interprets expertise; user completes profile via resume or bio
5. **Local-first** — profile, events, photos stay on your machine
