import React from 'react';
import { Minus, Square, X, Compass } from 'lucide-react';
import { desktopApi } from '../lib/desktop-api';
import styles from './WindowHeader.module.css';

interface WindowHeaderProps {
  title?: string;
  showBrand?: boolean;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  title = 'DeskPilot',
  showBrand = true,
}) => {
  const handleMinimize = async () => {
    try {
      await desktopApi.window.minimize();
    } catch (e) {
      console.warn('Minimize error', e);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await desktopApi.window.toggleMaximize();
    } catch (e) {
      console.warn('Maximize error', e);
    }
  };

  const handleClose = async () => {
    try {
      await desktopApi.window.hide();
    } catch (e) {
      console.warn('Close error', e);
    }
  };

  return (
    <header className={styles.header} data-tauri-drag-region>
      <div className={styles.brandArea} data-tauri-drag-region>
        {showBrand && (
          <div className={styles.brandMark}>
            <Compass size={15} strokeWidth={2.2} />
          </div>
        )}
        <span className={styles.title} data-tauri-drag-region>{title}</span>
      </div>

      <div className={styles.dragSpacer} data-tauri-drag-region />

      <div className={styles.controlsArea}>
        <button
          className={styles.controlBtn}
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus size={14} strokeWidth={1.8} />
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleToggleMaximize}
          title="Maximize"
          aria-label="Maximize"
        >
          <Square size={12} strokeWidth={1.8} />
        </button>

        <button
          className={`${styles.controlBtn} ${styles.closeBtn}`}
          onClick={handleClose}
          title="Close (Hide to tray)"
          aria-label="Close"
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
};
