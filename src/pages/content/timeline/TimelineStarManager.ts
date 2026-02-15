import { StarredMessagesService } from './StarredMessagesService';
import type { StarredMessage, StarredMessagesData } from './starredTypes';

/**
 * Callback interface so TimelineStarManager can notify TimelineManager
 * about star state changes without depending on its internals.
 */
export interface StarManagerDelegate {
  getConversationId(): string | null;
  getConversationTitle(): string;
  getMarkerSummary(turnId: string): string | undefined;
  onStarredSetChanged(starred: Set<string>): void;
}

/**
 * Manages starred (bookmarked) turn state for a single conversation.
 *
 * Extracted from the monolithic TimelineManager to:
 * - Isolate star persistence logic (localStorage + StarredMessagesService)
 * - Make star state independently testable
 * - Reduce TimelineManager's responsibility count
 */
export class TimelineStarManager {
  private starred: Set<string> = new Set();
  private delegate: StarManagerDelegate;

  constructor(delegate: StarManagerDelegate) {
    this.delegate = delegate;
  }

  /** Current set of starred turn IDs (read-only copy). */
  getStarredIds(): ReadonlySet<string> {
    return this.starred;
  }

  isStarred(turnId: string): boolean {
    return this.starred.has(turnId);
  }

  // ── Persistence ──────────────────────────────────────────────

  private getStorageKey(): string | null {
    const cid = this.delegate.getConversationId();
    return cid ? `geminiTimelineStars:${cid}` : null;
  }

  private safeLocalStorageGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('[TimelineStarManager] Failed to read localStorage:', error);
      return null;
    }
  }

  private safeLocalStorageSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('[TimelineStarManager] Failed to write localStorage:', error);
    }
  }

  /** Persist current starred set to localStorage. */
  save(): void {
    const key = this.getStorageKey();
    if (!key) return;
    this.safeLocalStorageSet(key, JSON.stringify(Array.from(this.starred)));
  }

  /** Load starred set from localStorage. */
  async load(): Promise<void> {
    this.starred.clear();
    const key = this.getStorageKey();
    if (!key) return;

    const raw = this.safeLocalStorageGet(key);
    if (!raw) return;

    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id: unknown) => this.starred.add(String(id)));
      }
    } catch (error) {
      console.warn('[TimelineStarManager] Failed to parse starred messages:', error);
    }
  }

  /** Sync from the shared StarredMessagesService (chrome.storage.local). */
  async syncFromService(): Promise<void> {
    const cid = this.delegate.getConversationId();
    if (!cid) return;
    try {
      const messages = await StarredMessagesService.getStarredMessagesForConversation(cid);
      const nextSet = new Set(messages.map((m) => String(m.turnId)));
      this.applySet(nextSet);
    } catch (error) {
      console.warn('[TimelineStarManager] Failed to sync from service:', error);
    }
  }

  // ── Mutation ─────────────────────────────────────────────────

  /**
   * Toggle a turn's starred state and persist to both localStorage
   * and the shared StarredMessagesService.
   */
  async toggle(turnId: string): Promise<void> {
    const id = String(turnId || '');
    if (!id) return;

    const wasStarred = this.starred.has(id);

    if (wasStarred) {
      this.starred.delete(id);
    } else {
      this.starred.add(id);
    }

    this.save();

    const cid = this.delegate.getConversationId();
    if (wasStarred) {
      if (cid) await StarredMessagesService.removeStarredMessage(cid, id);
    } else {
      const summary = this.delegate.getMarkerSummary(id);
      if (cid && summary !== undefined) {
        const message: StarredMessage = {
          turnId: id,
          content: summary,
          conversationId: cid,
          conversationUrl: window.location.href,
          conversationTitle: this.delegate.getConversationTitle(),
          starredAt: Date.now(),
        };
        await StarredMessagesService.addStarredMessage(message);
      }
    }

    // Notify the parent manager to update UI
    this.delegate.onStarredSetChanged(new Set(this.starred));
  }

  // ── Bulk updates (from storage events) ───────────────────────

  /**
   * Replace the starred set if it actually changed.
   * Called when a storage event or chrome.storage.onChanged fires.
   * @param persistLocal - whether to also write back to localStorage
   */
  applySet(nextSet: Set<string>, persistLocal = true): void {
    if (this.setsEqual(this.starred, nextSet)) return;
    this.starred = new Set(nextSet);
    if (persistLocal) this.save();
    this.delegate.onStarredSetChanged(new Set(this.starred));
  }

  /**
   * Apply starred data coming from the shared StarredMessagesData store.
   */
  applySharedData(data?: StarredMessagesData | null): void {
    const cid = this.delegate.getConversationId();
    if (!cid) return;
    const rawMessages = data?.messages?.[cid];
    const conversationMessages = Array.isArray(rawMessages) ? rawMessages : [];
    const nextSet = new Set(conversationMessages.map((m) => String(m.turnId)));
    this.applySet(nextSet);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) {
      if (!b.has(v)) return false;
    }
    return true;
  }
}
