import { getSessionEntry, resolveAgentIdFromSessionKey } from "./bot-runtime-api.js";

export function resolveFeishuReasoningPreviewEnabled(params: { sessionKey?: string }): boolean {
  if (!params.sessionKey) {
    return false;
  }

  try {
    const agentId = resolveAgentIdFromSessionKey(params.sessionKey);
    if (!agentId) {
      return false;
    }
    return getSessionEntry({ agentId, sessionKey: params.sessionKey })?.reasoningLevel === "stream";
  } catch {
    return false;
  }
}
