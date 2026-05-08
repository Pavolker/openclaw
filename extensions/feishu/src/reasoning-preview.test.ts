import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveFeishuReasoningPreviewEnabled } from "./reasoning-preview.js";

const { getSessionEntryMock, resolveAgentIdFromSessionKeyMock } = vi.hoisted(() => ({
  getSessionEntryMock: vi.fn(),
  resolveAgentIdFromSessionKeyMock: vi.fn(() => "main"),
}));

vi.mock("./bot-runtime-api.js", async () => {
  const actual =
    await vi.importActual<typeof import("./bot-runtime-api.js")>("./bot-runtime-api.js");
  return {
    ...actual,
    getSessionEntry: getSessionEntryMock,
    resolveAgentIdFromSessionKey: resolveAgentIdFromSessionKeyMock,
  };
});

afterAll(() => {
  vi.doUnmock("./bot-runtime-api.js");
  vi.resetModules();
});

describe("resolveFeishuReasoningPreviewEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAgentIdFromSessionKeyMock.mockReturnValue("main");
  });

  it("enables previews only for stream reasoning sessions", () => {
    getSessionEntryMock.mockImplementation(({ sessionKey }: { sessionKey: string }) => {
      const entries: Record<string, { reasoningLevel: string }> = {
        "agent:main:feishu:dm:ou_sender_1": { reasoningLevel: "stream" },
        "agent:main:feishu:dm:ou_sender_2": { reasoningLevel: "on" },
      };
      return entries[sessionKey];
    });

    expect(
      resolveFeishuReasoningPreviewEnabled({
        sessionKey: "agent:main:feishu:dm:ou_sender_1",
      }),
    ).toBe(true);
    expect(
      resolveFeishuReasoningPreviewEnabled({
        sessionKey: "agent:main:feishu:dm:ou_sender_2",
      }),
    ).toBe(false);
  });

  it("returns false for missing sessions or load failures", () => {
    getSessionEntryMock.mockImplementationOnce(() => {
      throw new Error("disk unavailable");
    });

    expect(
      resolveFeishuReasoningPreviewEnabled({
        sessionKey: "agent:main:feishu:dm:ou_sender_1",
      }),
    ).toBe(false);
    expect(resolveFeishuReasoningPreviewEnabled({})).toBe(false);
  });
});
