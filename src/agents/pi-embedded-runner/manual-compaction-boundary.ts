import {
  loadSqliteSessionTranscriptEvents,
  replaceSqliteSessionTranscriptEvents,
  resolveSqliteSessionTranscriptScopeForPath,
} from "../../config/sessions/transcript-store.sqlite.js";
import type { AgentMessage } from "../agent-core-contract.js";
import type { SessionEntry, SessionHeader } from "../transcript/session-transcript-contract.js";
import { TranscriptState } from "../transcript/transcript-state.js";

type CompactionEntry = Extract<SessionEntry, { type: "compaction" }>;

export type HardenedManualCompactionBoundary = {
  applied: boolean;
  firstKeptEntryId?: string;
  leafId?: string;
  messages: AgentMessage[];
  sessionManager?: TranscriptState;
};

function replaceLatestCompactionBoundary(params: {
  entries: SessionEntry[];
  compactionEntryId: string;
}): SessionEntry[] {
  return params.entries.map((entry) => {
    if (entry.type !== "compaction" || entry.id !== params.compactionEntryId) {
      return entry;
    }
    return {
      ...entry,
      // Manual /compact is an explicit checkpoint request, so make the
      // rebuilt context start from the summary itself instead of preserving
      // an upstream "recent tail" that can keep large prior turns alive.
      firstKeptEntryId: entry.id,
    } satisfies CompactionEntry;
  });
}

export async function hardenManualCompactionBoundary(params: {
  sessionFile: string;
  preserveRecentTail?: boolean;
}): Promise<HardenedManualCompactionBoundary> {
  const scope = resolveSqliteSessionTranscriptScopeForPath({
    transcriptPath: params.sessionFile,
  });
  if (!scope) {
    throw new Error(
      `Legacy transcript has not been imported into SQLite: ${params.sessionFile}. Run "openclaw doctor --fix" to build the session database.`,
    );
  }
  const events = loadSqliteSessionTranscriptEvents(scope).map((entry) => entry.event);
  const fileEntries = events.filter((event): event is SessionEntry | SessionHeader =>
    Boolean(event && typeof event === "object"),
  );
  const header = fileEntries.find((entry) => entry?.type === "session") ?? null;
  const entries = fileEntries.filter((entry): entry is SessionEntry => entry?.type !== "session");
  const state = new TranscriptState({ header, entries });
  if (!header) {
    return {
      applied: false,
      messages: [],
      sessionManager: state,
    };
  }

  const leaf = state.getLeafEntry();
  if (leaf?.type !== "compaction") {
    const sessionContext = state.buildSessionContext();
    return {
      applied: false,
      leafId: state.getLeafId() ?? undefined,
      messages: sessionContext.messages,
      sessionManager: state,
    };
  }

  if (params.preserveRecentTail) {
    const sessionContext = state.buildSessionContext();
    return {
      applied: false,
      firstKeptEntryId: leaf.firstKeptEntryId,
      leafId: state.getLeafId() ?? undefined,
      messages: sessionContext.messages,
      sessionManager: state,
    };
  }

  if (leaf.firstKeptEntryId === leaf.id) {
    const sessionContext = state.buildSessionContext();
    return {
      applied: false,
      firstKeptEntryId: leaf.id,
      leafId: state.getLeafId() ?? undefined,
      messages: sessionContext.messages,
      sessionManager: state,
    };
  }

  const replacedEntries = replaceLatestCompactionBoundary({
    entries: state.getEntries(),
    compactionEntryId: leaf.id,
  });
  const replacedState = new TranscriptState({
    header,
    entries: replacedEntries,
  });
  replaceSqliteSessionTranscriptEvents({
    ...scope,
    transcriptPath: params.sessionFile,
    events: [header, ...replacedEntries],
  });

  const sessionContext = replacedState.buildSessionContext();
  return {
    applied: true,
    firstKeptEntryId: leaf.id,
    leafId: replacedState.getLeafId() ?? undefined,
    messages: sessionContext.messages,
    sessionManager: replacedState,
  };
}
