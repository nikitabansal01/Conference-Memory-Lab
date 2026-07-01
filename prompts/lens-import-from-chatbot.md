# Lens import from ChatGPT / Claude

User copy-paste prompt — served via GET /api/profile/lens-import-prompt (body is everything after the line below).

---

I use you to brainstorm projects, explore new topics, and work through ideas — and I have memory on, so you already know a lot about me from our past conversations.

I'm setting up Conference Memory Lab, an app that turns networking events (mixers, panels, conferences, webinars) into grounded memory and content filtered through my unique lens — not generic event recaps.

Please synthesize everything you know about me from our conversation history and memory into a profile I can paste into the app. Focus on:

1. Who I am professionally — role, background, one-line expertise
2. What I'm actively learning — topics I'm going deeper on right now
3. Ongoing projects & content areas — work, side projects, or themes I want event insights to feed
4. My voice & thinking style — how I write, what I avoid, questions I naturally ask

Rules:
- Use ONLY what you can infer from our history and memory. Do not invent facts.
- Where uncertain, write "[uncertain]" or leave a field blank with a note.
- If context is thin, say what's missing and ask 2–3 quick questions instead of guessing.
- Prioritize projects and learning areas I've mentioned recently or repeatedly.

Respond in EXACTLY this format (keep the ## headers — I will copy each section into the app):

## Name
[how I usually go by]

## Tagline
[one line on what I bring — the intersection of my expertise]

## Current role
[title and context if known]

## Education
[degree/school if known, or "Not in our history"]

## Learning goals & expertise
[one topic per line — e.g. LLM evals, healthcare AI, UI/UX]

## Ongoing projects
[one project or content area per line — where I apply event learnings]

## Voice & how I think
[one trait per line — e.g. curious but grounded, names tradeoffs not hype]

## What to avoid in my writing
[one pattern per line — e.g. emoji, generic AI hype, restating slides]

## Questions I naturally ask
[one per line — sharp questions I'd ask at a panel or about an idea]

## Past writing samples
[LinkedIn posts, drafts, or writing examples from our chats — or "None in our history"]

## Confidence note
[1–2 sentences: what you're confident about vs what I should fill in manually]
