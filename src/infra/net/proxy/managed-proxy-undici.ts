import type { EnvHttpProxyAgent } from "undici";
import { resolveEnvHttpProxyAgentOptions } from "../proxy-env.js";
import { getActiveManagedProxyTlsOptions } from "./active-proxy-state.js";

export type ManagedEnvHttpProxyAgentOptions = ConstructorParameters<typeof EnvHttpProxyAgent>[0];

function hasProxyTlsOptions(options: ManagedEnvHttpProxyAgentOptions | undefined): boolean {
  return typeof options?.proxyTls === "object" && options.proxyTls !== null;
}

export function addActiveManagedProxyTlsOptions(
  options: ManagedEnvHttpProxyAgentOptions | undefined,
): ManagedEnvHttpProxyAgentOptions | undefined {
  if (!options || hasProxyTlsOptions(options)) {
    return options;
  }
  const proxyTls = getActiveManagedProxyTlsOptions();
  if (!proxyTls) {
    return options;
  }
  return {
    ...options,
    proxyTls: { ...proxyTls },
  };
}

export function resolveManagedEnvHttpProxyAgentOptions(
  env: NodeJS.ProcessEnv = process.env,
): ManagedEnvHttpProxyAgentOptions | undefined {
  return addActiveManagedProxyTlsOptions(resolveEnvHttpProxyAgentOptions(env));
}
