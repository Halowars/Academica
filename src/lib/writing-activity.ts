import type { Node } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { ReplaceAroundStep, ReplaceStep } from '@tiptap/pm/transform';
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { uid, type Section } from './model';

export const WRITING_ACTIVITY_LIMIT = 250;
const MAX_SNAPSHOT_BYTES = 64 * 1024;
const IDLE_MS = 650;
const BURST_MS = 3000;

type EntryDetails = {
  captureId: string;
  paperId: string;
  sectionId: string;
  sectionTitle: string;
  startedAt: number;
  pastedWords?: number;
};
export type WritingActivityEntry = EntryDetails & { snapshot?: Uint8Array };
export type SavedWritingActivity = WritingActivityEntry & { id: number };
type DraftEntry = EntryDetails & { before: Node; after: Node };
type RecoveryEntry = EntryDetails & { snapshot?: string };
type ActivityStorage = {
  saveWritingActivity: (entry: WritingActivityEntry) => Promise<void>;
  localWritingActivity: (paperId: string) => Promise<SavedWritingActivity[]>;
};

function leafText(node: Node) {
  return node.type.name === 'hardBreak' ? '\n' : '';
}

function plainText(doc: Node) {
  return doc.textBetween(0, doc.content.size, '\n', leafText);
}

function pasteWordCount(transaction: Transaction) {
  const text = transaction.steps.map(step => {
    if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) return '';
    const content = step.slice.content;
    return content.textBetween(0, content.size, '\n', leafText);
  }).join(' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

export function playbackText(entry: WritingActivityEntry): [before: string, after: string] | undefined {
  try {
    if (entry.snapshot) return JSON.parse(strFromU8(inflateSync(entry.snapshot)));
  } catch {
    // One unreadable snapshot can be skipped while the activity remains visible.
  }
}

export function createWritingActivity(storage: ActivityStorage, scope = 'device') {
  let draft: DraftEntry | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = Promise.resolve();
  const waiting = new Map<string, WritingActivityEntry>();
  const failed = new Set<string>();
  const recoveryPrefix = `academica-writing-recovery:${encodeURIComponent(scope)}:`;
  const recoveryKey = (entry: EntryDetails) => recoveryPrefix + encodeURIComponent(entry.paperId) + ':' + entry.captureId;

  function enqueue(entry: WritingActivityEntry) {
    if (waiting.has(entry.captureId)) return;
    waiting.set(entry.captureId, entry);
    pending = pending.then(async () => {
      try {
        await storage.saveWritingActivity(entry);
        try { window.localStorage.removeItem(recoveryKey(entry)); } catch {}
      } catch {
        failed.add(entry.paperId);
      } finally {
        waiting.delete(entry.captureId);
      }
    });
  }

  function flush() {
    clearTimeout(timer);
    const entry = draft;
    draft = undefined;
    if (!entry) return pending;

    try {
      const { before, after, ...details } = entry;
      const first = plainText(before), last = plainText(after);
      if (first === last && details.pastedWords === undefined) return pending;
      const snapshot = deflateSync(strToU8(JSON.stringify([first, last])), { level: 1 });
      enqueue({ ...details, snapshot: snapshot.byteLength <= MAX_SNAPSHOT_BYTES ? snapshot : undefined });
    } catch {
      failed.add(entry.paperId);
    }
    return pending;
  }

  function suspend() {
    // A page can freeze before its IndexedDB transaction completes.
    void flush();
    for (const entry of waiting.values()) {
      const { snapshot, ...details } = entry;
      try {
        window.localStorage.setItem(recoveryKey(entry), JSON.stringify({ ...details, snapshot: snapshot && btoa(strFromU8(snapshot, true)) }));
      } catch {}
    }
  }

  function recover() {
    try {
      const journal = window.localStorage;
      for (const key of Object.keys(journal)) {
        if (!key.startsWith(recoveryPrefix)) continue;
        try {
          const { snapshot, ...details } = JSON.parse(journal.getItem(key) || 'null') as RecoveryEntry;
          if (recoveryKey(details) === key) enqueue({ ...details, snapshot: snapshot ? strToU8(atob(snapshot), true) : undefined });
        } catch {}
      }
    } catch {}
    return pending;
  }

  function record(paperId: string, section: Pick<Section, 'id' | 'title'>, transaction: Transaction, after: Node) {
    if (transaction.getMeta('preventUpdate') || (!transaction.docChanged && transaction.before === after)) return;
    const paste = transaction.getMeta('paste') === true || transaction.getMeta('uiEvent') === 'paste';
    const now = Date.now();
    if (draft && (paste || draft.paperId !== paperId || draft.sectionId !== section.id || draft.after !== transaction.before || now - draft.startedAt >= BURST_MS)) {
      void flush();
    }
    draft ??= { captureId: uid(), paperId, sectionId: section.id, sectionTitle: section.title, startedAt: now, before: transaction.before, after };
    draft.after = after;
    if (paste) {
      draft.pastedWords = pasteWordCount(transaction);
      void flush();
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(flush, Math.min(IDLE_MS, BURST_MS - (now - draft.startedAt)));
  }

  return {
    record,
    flush,
    suspend,
    recover,
    async read(paperId: string) {
      void flush();
      await recover();
      return { entries: await storage.localWritingActivity(paperId), incomplete: failed.has(paperId) };
    }
  };
}

export type WritingActivity = ReturnType<typeof createWritingActivity>;
