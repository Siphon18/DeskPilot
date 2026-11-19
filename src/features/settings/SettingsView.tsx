import React, { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import type { AppSettings } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import { useToast } from '../../components/Toast';
import styles from './SettingsView.module.css';

interface SettingsViewProps {
  currentTheme: 'system' | 'light' | 'dark';
  onThemeChange: (theme: 'system' | 'light' | 'dark') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentTheme, onThemeChange }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [urlDelay, setUrlDelay] = useState(250);
  const { showToast } = useToast();

  useEffect(() => {
    desktopApi.settings.get().then((res) => {
      setSettings(res);
      setUrlDelay(res.urlDelayMs);
    });
  }, []);

  const handleOpenFolder = async () => {
    try {
      await desktopApi.settings.openDataFolder();
    } catch (e: any) {
      showToast(e.message || 'Failed to open data folder', 'error');
    }
  };

  const handleSaveDelay = async (val: number) => {
    setUrlDelay(val);
    if (settings) {
      const updated = { ...settings, urlDelayMs: val };
      setSettings(updated);
      try {
        await desktopApi.settings.update(updated);
        showToast('Settings saved', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to update settings', 'error');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage preferences, keyboard shortcuts, and local storage</p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Theme</span>
            <span className={styles.rowDesc}>Choose between Light, Dark, or follow Windows system theme</span>
          </div>

          <div className={styles.themeSelector}>
            <button
              className={`${styles.themeBtn} ${currentTheme === 'system' ? styles.themeBtnActive : ''}`}
              onClick={() => onThemeChange('system')}
            >
              System
            </button>
            <button
              className={`${styles.themeBtn} ${currentTheme === 'light' ? styles.themeBtnActive : ''}`}
              onClick={() => onThemeChange('light')}
            >
              Light
            </button>
            <button
              className={`${styles.themeBtn} ${currentTheme === 'dark' ? styles.themeBtnActive : ''}`}
              onClick={() => onThemeChange('dark')}
            >
              Dark
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Global Shortcut & Switcher</h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Quick Switcher Shortcut</span>
            <span className={styles.rowDesc}>
              Summons the workspace switcher from anywhere while DeskPilot is running
            </span>
          </div>
          <span className={styles.shortcutBadge}>
            {settings?.globalShortcut || 'Ctrl + Alt + Space'}
          </span>
        </div>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>In-App Quick Switcher</span>
            <span className={styles.rowDesc}>Press while DeskPilot has window focus</span>
          </div>
          <span className={styles.shortcutBadge}>Ctrl + K</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Launch Behavior</h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>URL Stagger Delay</span>
            <span className={styles.rowDesc}>
              Delay in milliseconds between successive browser link opens (0–1500 ms)
            </span>
          </div>
          <input
            type="number"
            className={styles.inputNumber}
            value={urlDelay}
            min={0}
            max={1500}
            step={50}
            onChange={(e) => handleSaveDelay(Number(e.target.value))}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Local Data & Storage</h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Data Directory</span>
            <span className={styles.rowDesc}>
              {settings?.dataDirectory || '%LOCALAPPDATA%\\DeskPilot'}
            </span>
          </div>
          <button className={styles.actionBtn} onClick={handleOpenFolder}>
            <FolderOpen size={15} style={{ marginRight: 6 }} />
            <span>Open Data Folder</span>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About DeskPilot</h2>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>DeskPilot v1.1 (Lightweight Windows Edition)</span>
            <span className={styles.rowDesc}>
              Built with Tauri 2, Rust, and system WebView2. Zero telemetry, strictly local-first.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
