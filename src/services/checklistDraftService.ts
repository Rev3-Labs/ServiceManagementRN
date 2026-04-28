import {safeAsyncStorage} from '../utils/storage';
import {ChecklistAnswer} from '../types/checklist';

const CHECKLIST_DRAFTS_KEY = '@checklist_drafts';

export interface ChecklistDraft {
  draftKey: string;
  answers: Record<string, ChecklistAnswer>;
  confirmedIds: string[]; // Set<string> serialized as array
  skippedIds: string[]; // Set<string> serialized as array
  updatedAt: number;
}

type Listener = () => void;

class ChecklistDraftService {
  private drafts: Map<string, ChecklistDraft> = new Map();
  private listeners: Set<Listener> = new Set();
  private loaded = false;
  private loadPromise: Promise<void>;

  constructor() {
    this.loadPromise = this.loadDrafts();
  }

  private async loadDrafts(): Promise<void> {
    try {
      const stored = await safeAsyncStorage.getItem(CHECKLIST_DRAFTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, ChecklistDraft>;
        Object.entries(parsed).forEach(([key, draft]) => {
          this.drafts.set(key, draft);
        });
      }
    } catch (error) {
      console.error('[ChecklistDraftService] Error loading drafts:', error);
    } finally {
      this.loaded = true;
      this.notify();
    }
  }

  private async persist(): Promise<void> {
    try {
      const obj: Record<string, ChecklistDraft> = {};
      this.drafts.forEach((draft, key) => {
        obj[key] = draft;
      });
      await safeAsyncStorage.setItem(
        CHECKLIST_DRAFTS_KEY,
        JSON.stringify(obj),
      );
    } catch (error) {
      console.error('[ChecklistDraftService] Error saving drafts:', error);
    }
  }

  /**
   * Synchronously read the draft for a given key (returns null if none or
   * the service hasn't finished its initial load yet — callers that need
   * the very first read can `await ready()` first).
   */
  getDraft(draftKey: string): ChecklistDraft | null {
    return this.drafts.get(draftKey) || null;
  }

  /**
   * Save (or overwrite) a draft. Empty drafts (no answers / confirmed / skipped)
   * are removed instead of stored, so canceling without making any progress
   * doesn't leave dangling entries.
   */
  async saveDraft(
    draftKey: string,
    answers: Record<string, ChecklistAnswer>,
    confirmedIds: string[],
    skippedIds: string[],
  ): Promise<void> {
    const isEmpty =
      Object.keys(answers).length === 0 &&
      confirmedIds.length === 0 &&
      skippedIds.length === 0;

    if (isEmpty) {
      if (this.drafts.has(draftKey)) {
        this.drafts.delete(draftKey);
        await this.persist();
        this.notify();
      }
      return;
    }

    const draft: ChecklistDraft = {
      draftKey,
      answers,
      confirmedIds,
      skippedIds,
      updatedAt: Date.now(),
    };
    this.drafts.set(draftKey, draft);
    await this.persist();
    this.notify();
  }

  /**
   * Remove a draft (e.g., on completion).
   */
  async clearDraft(draftKey: string): Promise<void> {
    if (!this.drafts.has(draftKey)) return;
    this.drafts.delete(draftKey);
    await this.persist();
    this.notify();
  }

  /**
   * Subscribe to draft changes.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('[ChecklistDraftService] listener error:', e);
      }
    });
  }

  ready(): Promise<void> {
    return this.loadPromise;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const checklistDraftService = new ChecklistDraftService();
