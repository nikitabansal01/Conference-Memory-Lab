# Example pipeline outputs

These files show the full **extract → synthesize → draft** flow for the sample SF LLM Eval Mixer event. Reproduce with:

```bash
npm run lab -- new --title "SF LLM Eval Mixer" --type mixer --notes examples/sample-event-notes.md
npm run lab -- complete extract --session <id> --json examples/pipeline/extract.json
npm run lab -- complete synthesize --session <id> --json examples/pipeline/synthesize.json
npm run lab -- complete draft --session <id> --json examples/pipeline/draft.json
```
