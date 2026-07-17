# Gold LinkedIn post (user — target quality)

I used to think evals were primarily a way to tell whether an AI system was "good" or "bad."

The more I learn, the more I think evals are really about building confidence in the entire system.

A few things that stuck with me recently:

* Evals give you traces into AI workflows. When something goes wrong, you can inspect where it broke instead of guessing.
* They help answer questions beyond model quality: Did the right tool get called? Did memory work? Did the agent recover? Did the user achieve their goal?
* Once good evals are in place, I expect agents to proactively identify failures—and eventually fix many of them.

Three ways teams evaluate AI systems today:

1. Deterministic

   * Latency
   * Structure
   * Safety
   * Tool execution

2. LLM-as-a-Judge

   * Helpfulness
   * Tone
   * Completeness

3. Human-in-the-Loop

   * Still the most reliable approach for nuanced, domain-specific tasks.
   * The challenge is making it scalable.

Some places where evals become especially important:

* Products with established PMF and lots of user data.
* Regulated industries that need confidence before launch.
* Teams that have a clear definition of what "good" means.

One practical takeaway:

If your eval can't reproduce a production issue, that's not a failure of the eval—it's a clue.

Start simple. Add sophistication only when needed.

Ultimately, evals aren't just measuring models.

They're helping us build AI systems we can trust.
