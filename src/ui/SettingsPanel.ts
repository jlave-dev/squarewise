import { Modal } from './Modal';
import { settingsStore } from '../storage/SettingsStore';
import type { UserSettings } from '../types/game';

type ToggleSettingKey = 'showTimer' | 'showErrors' | 'soundEnabled' | 'hapticFeedback';

/**
 * Settings panel UI
 */
export class SettingsPanel {
  private modal: Modal;
  private settings: UserSettings | null = null;
  private readonly supportsHaptics: boolean;
  onThemeChange?: (theme: UserSettings['theme']) => void;

  constructor() {
    this.modal = new Modal();
    this.supportsHaptics = this.detectHapticSupport();
    void this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    await settingsStore.load();
    this.settings = { ...settingsStore.getSettings() };
  }

  /**
   * Open the settings panel
   */
  async open(): Promise<void> {
    // Render immediately from in-memory values so the modal never blocks on storage.
    if (!this.settings) {
      this.settings = { ...settingsStore.getSettings() };
    }

    this.modal.clear();
    this.modal.setTitle('Settings');

    const content = await this.createContent();
    this.modal.setContent(content);

    this.modal.addButton('Done', () => {
      this.modal.close();
    }, 'primary');

    this.modal.addButton('Reset', async () => {
      await settingsStore.reset();
      this.settings = { ...settingsStore.getSettings() };
      this.applyTheme(this.settings.theme);
      this.onThemeChange?.(this.settings.theme);
      const refreshedContent = await this.createContent();
      this.modal.setContent(refreshedContent);
    }, 'secondary');

    this.modal.open();

    // Refresh controls with persisted values once storage finishes loading.
    if (!settingsStore.isLoaded()) {
      void this.loadSettings().then(async () => {
        if (!this.modal.isOpen()) return;
        const refreshedContent = await this.createContent();
        this.modal.setContent(refreshedContent);
      });
    }
  }

  private async createContent(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.className = 'settings-panel';

    // Theme selector
    container.appendChild(this.createSettingItem(
      'Theme',
      this.createThemeSelector()
    ));

    // Toggle options
    container.appendChild(this.createSettingItem(
      'Show Timer',
      this.createToggle('showTimer', this.settings?.showTimer ?? true)
    ));

    container.appendChild(this.createSettingItem(
      'Show Errors',
      this.createToggle('showErrors', this.settings?.showErrors ?? true)
    ));

    container.appendChild(this.createSettingItem(
      'Sound Effects',
      this.createToggle('soundEnabled', this.settings?.soundEnabled ?? false)
    ));

    if (this.supportsHaptics) {
      container.appendChild(this.createSettingItem(
        'Haptic Feedback',
        this.createToggle('hapticFeedback', this.settings?.hapticFeedback ?? true)
      ));
    }

    return container;
  }

  private createSettingItem(label: string, control: HTMLElement): HTMLElement {
    const item = document.createElement('div');
    item.className = 'setting-item';
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--grid-line);
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `color: var(--text-primary);`;

    item.appendChild(labelEl);
    item.appendChild(control);

    return item;
  }

  private createThemeSelector(): HTMLElement {
    const select = document.createElement('select');
    select.style.cssText = `
      padding: 8px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--grid-line);
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: 1rem;
    `;

    const options = [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'auto', label: 'Auto' },
    ];

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (this.settings?.theme === opt.value) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    select.value = this.settings?.theme ?? 'auto';

    select.addEventListener('change', async (e) => {
      const value = (e.target as HTMLSelectElement).value as UserSettings['theme'];
      await settingsStore.updateSetting('theme', value);
      this.settings = { ...settingsStore.getSettings() };
      select.value = this.settings.theme;
      this.applyTheme(value);
      this.onThemeChange?.(value);
    });

    return select;
  }

  private createToggle(key: ToggleSettingKey, initialValue: boolean): HTMLElement {
    const toggle = document.createElement('div');
    toggle.className = `toggle ${initialValue ? 'active' : ''}`;
    toggle.style.cssText = `
      position: relative;
      width: 48px;
      height: 28px;
      background: ${initialValue ? 'var(--accent)' : 'var(--grid-line)'};
      border-radius: 14px;
      cursor: pointer;
      transition: background 0.2s ease;
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      position: absolute;
      top: 2px;
      left: 2px;
      width: 24px;
      height: 24px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s ease;
      transform: translateX(${initialValue ? '20px' : '0'});
    `;
    toggle.appendChild(knob);

    toggle.addEventListener('click', async () => {
      const newValue = !toggle.classList.contains('active');
      toggle.classList.toggle('active');
      toggle.style.background = newValue ? 'var(--accent)' : 'var(--grid-line)';
      knob.style.transform = `translateX(${newValue ? '20px' : '0'})`;

      await settingsStore.updateSetting(key, newValue);
      if (this.settings) {
        this.settings[key] = newValue;
      }
    });

    return toggle;
  }

  private applyTheme(theme: UserSettings['theme']): void {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  private detectHapticSupport(): boolean {
    if (!('vibrate' in navigator)) return false;
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  /**
   * Close the settings panel
   */
  close(): void {
    this.modal.close();
  }

  /**
   * Toggle the settings panel
   */
  async toggle(): Promise<void> {
    if (this.modal.isOpen()) {
      this.close();
    } else {
      await this.open();
    }
  }
}
