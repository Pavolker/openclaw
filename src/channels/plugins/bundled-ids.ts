import {
  listChannelCatalogEntries,
  type PluginChannelCatalogEntry,
} from "../../plugins/channel-catalog-registry.js";
import { resolveBundledChannelRootScope } from "./bundled-root.js";

const bundledChannelCatalogEntriesByRoot = new Map<string, readonly PluginChannelCatalogEntry[]>();

function listBundledChannelCatalogEntriesForRoot(
  packageRoot: string,
  env: NodeJS.ProcessEnv,
): readonly PluginChannelCatalogEntry[] {
  const cached = bundledChannelCatalogEntriesByRoot.get(packageRoot);
  if (cached) {
    return cached;
  }
  const entries = listChannelCatalogEntries({ origin: "bundled", env });
  bundledChannelCatalogEntriesByRoot.set(packageRoot, entries);
  return entries;
}

export function listBundledChannelPluginIdsForRoot(
  packageRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return listBundledChannelCatalogEntriesForRoot(packageRoot, env)
    .map((entry) => entry.pluginId)
    .toSorted((left, right) => left.localeCompare(right));
}

export function listBundledChannelIdsForRoot(
  packageRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return listBundledChannelCatalogEntriesForRoot(packageRoot, env)
    .map((entry) => entry.channel.id)
    .filter((channelId): channelId is string => Boolean(channelId))
    .toSorted((left, right) => left.localeCompare(right));
}

export function listBundledChannelPluginIds(env: NodeJS.ProcessEnv = process.env): string[] {
  return listBundledChannelPluginIdsForRoot(resolveBundledChannelRootScope(env).cacheKey, env);
}

export function listBundledChannelIds(env: NodeJS.ProcessEnv = process.env): string[] {
  return listBundledChannelIdsForRoot(resolveBundledChannelRootScope(env).cacheKey, env);
}
