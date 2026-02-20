import { getSetting, setSetting } from './IndexedDB';
import type { UserSettings } from '../types/game';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto',
  showTimer: true,
  showErrors: true,
  soundEnabled: false,
  hapticFeedback: true,
};

const SETTINGS_KEY = 'userSettings';
const SETTINGS_LOCAL_KEY = 'squarewise.userSettings.v1';

/**
 * Settings store for user preferences
 */
class SettingsStore {
  private settings: UserSettings;
  private listeners: Set<(settings: UserSettings) => void> = new Set();
  private loaded: boolean = false;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Load settings from IndexedDB
   */
  async load(): Promise<void> {
    const localSettings = this.readLocalSettings();
    if (localSettings) {
      this.settings = { ...DEFAULT_SETTINGS, ...localSettings };
      this.loaded = true;
      this.notifyListeners();
      return;
    }

    try {
      const saved = await getSetting<UserSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
      this.settings = { ...DEFAULT_SETTINGS, ...saved };
      this.loaded = true;
      this.writeLocalSettings(this.settings);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
      this.writeLocalSettings(this.settings);
    }
  }

  /**
   * Save settings to IndexedDB
   */
  async save(): Promise<void> {
    // Write synchronously so fast refreshes still keep latest value.
    this.writeLocalSettings(this.settings);

    try {
      await setSetting(SETTINGS_KEY, this.settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): Readonly<UserSettings> {
    return this.settings;
  }

  /**
   * Update a single setting
   */
  async updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): Promise<void> {
    this.settings[key] = value;
    await this.save();
    this.notifyListeners();
  }

  /**
   * Update multiple settings
   */
  async updateSettings(partial: Partial<UserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    await this.save();
    this.notifyListeners();
  }

  /**
   * Reset to defaults
   */
  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.save();
    this.notifyListeners();
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.settings);
    }
  }

  private readLocalSettings(): UserSettings | null {
    try {
      const raw = localStorage.getItem(SETTINGS_LOCAL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return null;
    }
  }

  private writeLocalSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to write settings to localStorage:', error);
    }
  }

  /**
   * Check if settings have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  // Convenience getters
  get theme(): UserSettings['theme'] {
    return this.settings.theme;
  }

  get showTimer(): boolean {
    return this.settings.showTimer;
  }

  get showErrors(): boolean {
    return this.settings.showErrors;
  }

  get soundEnabled(): boolean {
    return this.settings.soundEnabled;
  }

  get hapticFeedback(): boolean {
    return this.settings.hapticFeedback;
  }
}

// Singleton instance
export const settingsStore = new SettingsStore();
