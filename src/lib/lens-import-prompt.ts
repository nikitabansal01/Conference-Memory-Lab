import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "prompts");
const LENS_IMPORT_FILE = "lens-import-from-chatbot.md";

let cachedPrompt: string | null = null;

export async function loadLensImportPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;

  const raw = await readFile(join(PROMPTS_DIR, LENS_IMPORT_FILE), "utf-8");
  const sep = raw.indexOf("\n---\n");
  const body = (sep === -1 ? raw : raw.slice(sep + 5)).trim();
  if (!body) {
    throw new Error("Lens import prompt is empty");
  }

  cachedPrompt = body;
  return body;
}
