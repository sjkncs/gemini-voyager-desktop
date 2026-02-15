import { useCallback, useEffect, useReducer } from 'react';

import browser from 'webextension-polyfill';

type ScrollMode = 'jump' | 'flow';
type FormulaCopyFormat = 'latex' | 'unicodemath' | 'no-dollar';

/**
 * Consolidated settings state for the Popup.
 * Replaces ~15 individual useState calls with a single useReducer.
 */
export interface PopupSettings {
  mode: ScrollMode;
  hideContainer: boolean;
  draggableTimeline: boolean;
  markerLevelEnabled: boolean;
  folderEnabled: boolean;
  hideArchivedConversations: boolean;
  customWebsites: string[];
  formulaCopyFormat: FormulaCopyFormat;
  watermarkRemoverEnabled: boolean;
  hidePromptManager: boolean;
  inputCollapseEnabled: boolean;
  tabTitleUpdateEnabled: boolean;
  mermaidEnabled: boolean;
  quoteReplyEnabled: boolean;
  ctrlEnterSendEnabled: boolean;
  sidebarAutoHideEnabled: boolean;
}

const DEFAULT_SETTINGS: PopupSettings = {
  mode: 'flow',
  hideContainer: false,
  draggableTimeline: false,
  markerLevelEnabled: false,
  folderEnabled: true,
  hideArchivedConversations: false,
  customWebsites: [],
  formulaCopyFormat: 'latex',
  watermarkRemoverEnabled: true,
  hidePromptManager: false,
  inputCollapseEnabled: false,
  tabTitleUpdateEnabled: true,
  mermaidEnabled: true,
  quoteReplyEnabled: true,
  ctrlEnterSendEnabled: false,
  sidebarAutoHideEnabled: false,
};

/**
 * Mapping from PopupSettings keys to chrome.storage.sync keys.
 * This single source of truth eliminates the magic strings scattered
 * throughout Popup.tsx and the apply() function.
 */
const STORAGE_KEY_MAP: Record<keyof PopupSettings, string> = {
  mode: 'geminiTimelineScrollMode',
  hideContainer: 'geminiTimelineHideContainer',
  draggableTimeline: 'geminiTimelineDraggable',
  markerLevelEnabled: 'geminiTimelineMarkerLevel',
  folderEnabled: 'geminiFolderEnabled',
  hideArchivedConversations: 'geminiFolderHideArchivedConversations',
  customWebsites: 'gvPromptCustomWebsites',
  formulaCopyFormat: 'gvFormulaCopyFormat',
  watermarkRemoverEnabled: 'geminiWatermarkRemoverEnabled',
  hidePromptManager: 'gvHidePromptManager',
  inputCollapseEnabled: 'gvInputCollapseEnabled',
  tabTitleUpdateEnabled: 'gvTabTitleUpdateEnabled',
  mermaidEnabled: 'gvMermaidEnabled',
  quoteReplyEnabled: 'gvQuoteReplyEnabled',
  ctrlEnterSendEnabled: 'gvCtrlEnterSend',
  sidebarAutoHideEnabled: 'gvSidebarAutoHide',
};

// Reverse mapping: storage key → settings key
const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(STORAGE_KEY_MAP).map(([k, v]) => [v, k]),
) as Record<string, keyof PopupSettings>;

type SettingsAction =
  | { type: 'SET'; key: keyof PopupSettings; value: PopupSettings[keyof PopupSettings] }
  | { type: 'LOAD'; payload: Partial<PopupSettings> };

function settingsReducer(state: PopupSettings, action: SettingsAction): PopupSettings {
  switch (action.type) {
    case 'SET':
      if (state[action.key] === action.value) return state;
      return { ...state, [action.key]: action.value };
    case 'LOAD':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

/**
 * Build the defaults object for chrome.storage.sync.get() from the mapping.
 */
function buildStorageDefaults(): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [settingsKey, storageKey] of Object.entries(STORAGE_KEY_MAP)) {
    defaults[storageKey] = DEFAULT_SETTINGS[settingsKey as keyof PopupSettings];
  }
  return defaults;
}

/**
 * Parse a chrome.storage result into a Partial<PopupSettings>.
 */
function parseStorageResult(res: Record<string, unknown>): Partial<PopupSettings> {
  const parsed: Partial<PopupSettings> = {};

  for (const [storageKey, value] of Object.entries(res)) {
    const settingsKey = REVERSE_KEY_MAP[storageKey];
    if (!settingsKey) continue;

    const def = DEFAULT_SETTINGS[settingsKey];
    if (typeof def === 'boolean') {
      // Some booleans default to true — use `!== false` pattern
      if (def === true) {
        (parsed as Record<string, unknown>)[settingsKey] = value !== false;
      } else {
        (parsed as Record<string, unknown>)[settingsKey] = value === true;
      }
    } else if (settingsKey === 'mode') {
      if (value === 'jump' || value === 'flow') parsed.mode = value;
    } else if (settingsKey === 'formulaCopyFormat') {
      if (value === 'latex' || value === 'unicodemath' || value === 'no-dollar')
        parsed.formulaCopyFormat = value;
    } else if (settingsKey === 'customWebsites') {
      parsed.customWebsites = Array.isArray(value)
        ? value.filter((w: unknown) => typeof w === 'string')
        : [];
    }
  }

  return parsed;
}

async function setSyncStorage(payload: Record<string, unknown>): Promise<void> {
  try {
    await browser.storage.sync.set(payload);
    return;
  } catch {
    // Fallback to chrome.* if polyfill is unavailable.
  }

  await new Promise<void>((resolve) => {
    try {
      chrome.storage?.sync?.set(payload, () => resolve());
    } catch {
      resolve();
    }
  });
}

export function usePopupSettings() {
  const [settings, dispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS);

  // Load settings from storage on mount
  useEffect(() => {
    try {
      chrome.storage?.sync?.get(buildStorageDefaults(), (res) => {
        if (res) dispatch({ type: 'LOAD', payload: parseStorageResult(res) });
      });
    } catch {
      // Storage unavailable
    }
  }, []);

  /**
   * Update a single setting: dispatch locally + persist to chrome.storage.sync.
   */
  const updateSetting = useCallback(
    <K extends keyof PopupSettings>(key: K, value: PopupSettings[K]) => {
      dispatch({ type: 'SET', key, value });
      const storageKey = STORAGE_KEY_MAP[key];
      if (storageKey) {
        void setSyncStorage({ [storageKey]: value });
      }
    },
    [],
  );

  /**
   * Apply a batch of settings at once (used by the old `apply()` pattern).
   */
  const applySettings = useCallback((updates: Partial<PopupSettings>) => {
    dispatch({ type: 'LOAD', payload: updates });
    const storagePayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      const storageKey = STORAGE_KEY_MAP[key as keyof PopupSettings];
      if (storageKey && value !== undefined) {
        storagePayload[storageKey] = value;
      }
    }
    if (Object.keys(storagePayload).length > 0) {
      void setSyncStorage(storagePayload);
    }
  }, []);

  return { settings, updateSetting, applySettings, dispatch, STORAGE_KEY_MAP };
}
