export function isLlmConfigured(): boolean {
  return Boolean(getLlmApiKey());
}

function getLlmApiKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim() ||
    undefined
  );
}

function getLlmBaseUrl(): string {
  return (process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
}

function getLlmModel(): string {
  return process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
}

export async function callLlm(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getLlmApiKey();
  if (!apiKey) {
    throw new Error("LLM is not configured. Set OPENAI_API_KEY on the server.");
  }

  const res = await fetch(`${getLlmBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getLlmModel(),
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const text = await res.text();
  let data: { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data.error?.message ?? `LLM request failed (${res.status})`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("LLM returned an empty response");
  }
  return content;
}

export function parseJsonFromLlm(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim()) as Record<string, unknown>;
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("Could not parse JSON from LLM response");
  }
}
