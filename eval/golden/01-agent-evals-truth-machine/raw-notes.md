# Raw notes (user-written at the event)

Excited to be at Notions HQ in SF. and learn from industry experts on Evals

Basic definitions:

- **Evals** = the **tests**. They measure whether the AI is getting better or worse (accuracy, safety, task success, latency, etc.).
- **Harness** = the **system around the AI** that you change to improve performance (prompts, workflows, tool selection, memory, routing, guardrails, etc.).
- **Traces** = detailed logs of everything that happened during an AI interaction—the user's input, the agent's reasoning steps (if captured), tool/API calls, retrieved context, outputs, errors, latency, and outcomes.

Braintrust:

- observability of evals
- super dumb rule for when you need evals is -> you use the product and it works sometimes and it doesn't work sometimes. If you fix, break, fix, break something else -> that's when you need a structure to systematically make improvements instead of whack-a-mollying it. Because in case of AI, there's no such definite visible thing. It's just a whack-a-mole game in case of AI.
- in 30 years from now, the further you go from a human looking at the app, you need more evals.
- agent built in called Loop.
- only way to build evals in a good way - to solve from trace to datasey

Zhen Li, Replit:

- check out replit eval benchmark that is public
- they built agents 3-4 times
- distill our knowledge in eval benchmarks, starting with what the user's end goal is and the definition of good as per their expectations
- initially you are the eval - the team is the eval
- Tier 1 is offline evals
- Tier 2
- building evals needs to go from end to end, closer to user's experience
- early on, we had an LM to edit the file. We created evals on which edit is good, but later retired all evals.
- we tried several evals in market but later learned that different model works for different company and use cases
- eval category called "hard features" - you try to test your eval on hardest feature to see if it works
- "many coding agents evals, but you should build it end to end for your use case, because user needs changes, eval harness changes"
- third kind of eval is A/B eval. analyze the traces of AI, Evaluate the harness change in offline first, if it works then online evals as well. Create this loop and use it continuously.

Fireworks AI:

- benchmarks agentic coding
- "models fail secretly, overall evals may work still -> if you use general industry evals"
- "evals specific to test use cases"

Sohan, Founder, Composio:

- ship agents easiest
- knowledge agents and coding agents
- verifyiability and repeatability in coding
- first way: deterministic way
- second way: LLM as a judge doesn't work anymore because you need a lot of manuevering to make it work
- "third way: human in the loop --> if you create a nice UI UX to get feedback from real users for HITL - awesome!!" But group it into different classes to separate good customer feedback with bad feedback before feeding it in the workflows.
- make you product as - UX, optimized workflow so the user can reach the end outcome after the feedback as well by automating, then use meta signals to create offline evals
- Model continuous learning is d/f from harness continuous learning: it is use case dependent

Value of evals:

- give you traces of ai workflows and you cansolve the problems based on traces
- after inserting evals, hopefully things don't break more. If they do, agents proactively go ahead and fix it.

**3 ways to evaluate LLMs:**

- deterministic which is through metrics we have traditionally had
- LLM as a judge
- Human in the loop: Soham introduced me to a really smart idea to scale HITL in a cost-effective and scalable way, which is the third and most reliable way to evaluate LLMs

**Good use cases of doing Evals:**

- product-market fit is established and you have lots of user data to find out a good signal
- companies in regulated industries sometimes want to do evals even before releasing their product in the market to ensure everything works correctly
- customers who know what matters, and know what good means
- try dumb hacks tell codex to go fix the evals if your eval is not able to product the problem. If you're stuck and your eval is not able to reproduce the problem with the existing evals, then create a slightly more sophisticated eval.

**Value of evals:**

- give you traces of ai workflows and you cansolve the problems based on traces
- after inserting evals, hopefully things don't break more. If they do, agents proactively go ahead and fix it.
