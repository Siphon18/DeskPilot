import React from 'react';
import { Minus, Square, X, Compass } from 'lucide-react';
import { desktopApi } from '../lib/desktop-api';
import styles from './WindowHeader.module.css';

interface WindowHeaderProps {
  title?: string;
  showBrand?: boolean;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  title = 'DeskPilot Settings & Workspaces',
  showBrand = true,
}) => {
  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await desktopApi.window.minimize();
    } catch (err) {
      console.warn('Minimize error', err);
    }
  };

  const handleToggleMaximize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await desktopApi.window.toggleMaximize();
    } catch (err) {
      console.warn('Maximize error', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await desktopApi.window.hide();
    } catch (err) {
      console.warn('Close error', err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only primary button drag
    if (e.buttons === 1) {
      desktopApi.window.startDragging().catch(() => {});
    }
  };

  return (
    <header
      className={styles.header}
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onDoubleClick={() => handleToggleMaximize()}
    >
      <div className={styles.brandArea} data-tauri-drag-region>
        {showBrand && (
          <div className={styles.brandMark} data-tauri-drag-region>
            <Compass size={14} strokeWidth={2.2} />
          </div>
        )}
        <span className={styles.title} data-tauri-drag-region>{title}</span>
      </div>

      <div className={styles.dragSpacer} data-tauri-drag-region />

      <div
        className={styles.controlsArea}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.controlBtn}
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus size={13} strokeWidth={1.8} />
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleToggleMaximize}
          title="Maximize / Restore"
          aria-label="Maximize / Restore"
        >
          <Square size={11} strokeWidth={1.8} />
        </button>

        <button
          className={`${styles.controlBtn} ${styles.closeBtn}`}
          onClick={handleClose}
          title="Close (Hide to tray)"
          aria-label="Close"
        >
          <X size={13} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
};
