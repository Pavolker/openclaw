import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLoadedRuntimePluginRegistry: vi.fn(),
  listAgentToolResultMiddlewares: vi.fn(() => []),
  loadOpenClawPlugins: vi.fn(),
  loadPluginManifestRegistry: vi.fn(),
}));

vi.mock("./active-runtime-registry.js", () => ({
  getLoadedRuntimePluginRegistry: mocks.getLoadedRuntimePluginRegistry,
}));

vi.mock("./agent-tool-result-middleware.js", () => ({
  listAgentToolResultMiddlewares: mocks.listAgentToolResultMiddlewares,
  normalizeAgentToolResultMiddlewareRuntimeIds: (value: unknown) =>
    Array.isArray(value) ? value : [],
}));

vi.mock("./loader.js", () => ({
  loadOpenClawPlugins: mocks.loadOpenClawPlugins,
}));

vi.mock("./manifest-registry.js", () => ({
  loadPluginManifestRegistry: mocks.loadPluginManifestRegistry,
}));

vi.mock("../logging/subsystem.js", () => ({
  createSubsystemLogger: () => ({
    warn: vi.fn(),
  }),
}));

describe("loadAgentToolResultMiddlewaresForRuntime", () => {
  beforeEach(() => {
    mocks.getLoadedRuntimePluginRegistry.mockReset();
    mocks.listAgentToolResultMiddlewares.mockReset();
    mocks.listAgentToolResultMiddlewares.mockReturnValue([]);
    mocks.loadOpenClawPlugins.mockReset();
    mocks.loadPluginManifestRegistry.mockReset();
    mocks.loadPluginManifestRegistry.mockReturnValue({
      plugins: [
        {
          id: "tool-result-middleware",
          origin: "bundled",
          contracts: { agentToolResultMiddleware: ["codex"] },
        },
      ],
    });
  });

  it("uses prepared Gateway runtime middleware before cold-loading plugins", async () => {
    const handler = vi.fn();
    mocks.getLoadedRuntimePluginRegistry.mockImplementation((params?: { surface?: string }) =>
      params?.surface === "gateway-runtime"
        ? {
            agentToolResultMiddlewares: [
              {
                runtimes: ["codex"],
                handler,
              },
            ],
          }
        : undefined,
    );

    const { loadAgentToolResultMiddlewaresForRuntime } =
      await import("./agent-tool-result-middleware-loader.js");

    await expect(loadAgentToolResultMiddlewaresForRuntime({ runtime: "codex" })).resolves.toEqual([
      handler,
    ]);
    expect(mocks.getLoadedRuntimePluginRegistry).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredPluginIds: ["tool-result-middleware"],
        surface: "gateway-runtime",
      }),
    );
    expect(mocks.loadOpenClawPlugins).not.toHaveBeenCalled();
  });
});
