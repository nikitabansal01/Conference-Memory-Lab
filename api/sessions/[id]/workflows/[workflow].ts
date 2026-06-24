import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApiRoute } from "../../../_handler.js";

const VALID_WORKFLOWS = new Set(["extract", "synthesize", "draft", "self-critique"]);

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = req.query.id;
  const workflow = req.query.workflow;
  const sessionId = Array.isArray(id) ? id[0] : id;
  const workflowName = Array.isArray(workflow) ? workflow[0] : workflow;

  if (!sessionId || !workflowName) {
    res.status(400).json({ error: "Session id and workflow required" });
    return Promise.resolve();
  }
  if (!VALID_WORKFLOWS.has(workflowName)) {
    res.status(400).json({ error: "Invalid workflow" });
    return Promise.resolve();
  }

  return handleApiRoute(req, res, `/api/sessions/${sessionId}/workflows/${workflowName}`);
}
