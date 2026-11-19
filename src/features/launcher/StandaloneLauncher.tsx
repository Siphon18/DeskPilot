import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Star,
  Layers,
  Code2,
  GraduationCap,
  Briefcase,
  Play,
  Settings,
  Camera,
  FileText,
  X,
} from 'lucide-react';
import type { WorkspaceDTO } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import { useToast } from '../../components/Toast';
import { listen } from '@tauri-apps/api/event';
import styles from './StandaloneLauncher.module.css';

export const StandaloneLauncher: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCapturingRef = useRef(false);
  const { showToast } = useToast();

  const loadWorkspaces = async () => {
    try {
      const data = await desktopApi.workspaces.list();
      setWorkspaces(data);
    } catch {
      // fallback
    }
  };

  const handleCaptureDesktop = async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const created = await desktopApi.workspaces.captureCurrent();
      showToast(`Captured "${created.name}" with ${created.items.length} apps`, 'success');
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to capture desktop', 'error');
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
      }, 1000);
    }
  };

  const handleCaptureRef = useRef(handleCaptureDesktop);
  handleCaptureRef.current = handleCaptureDesktop;

  useEffect(() => {
    loadWorkspaces();
    setTimeout(() => inputRef.current?.focus(), 40);

    // Sync Windows active accent color from Registry
    desktopApi.settings
      .getWindowsThemeColor()
      .then((color) => {
        const root = document.documentElement;
        root.style.setProperty('--win-accent', color.hex);
        root.style.setProperty('--win-accent-rgb', `${color.r}, ${color.g}, ${color.b}`);
        root.style.setProperty('--win-accent-subtle', color.accentSubtle);
        root.style.setProperty(
          '--win-accent-border',
          `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`
        );
      })
      .catch(() => {});

    // Listen to focus / activation events from background shortcut triggers
    let unlistenFocus: (() => void) | null = null;
    let unlistenCapture: (() => void) | null = null;

    listen('quick-launcher:focus', () => {
      loadWorkspaces();
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }).then((fn) => {
      unlistenFocus = fn;
    });

    listen('workspace:capture-desktop', () => {
      handleCaptureRef.current();
    }).then((fn) => {
      unlistenCapture = fn;
    });

    return () => {
      if (unlistenFocus) unlistenFocus();
      if (unlistenCapture) unlistenCapture();
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...workspaces];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          (w.items && w.items.some((i) => i.name.toLowerCase().includes(q)))
      );
    } else {
      list.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (!a.lastLaunchedAt && !b.lastLaunchedAt) return 0;
        if (!a.lastLaunchedAt) return 1;
        if (!b.lastLaunchedAt) return -1;
        return new Date(b.lastLaunchedAt).getTime() - new Date(a.lastLaunchedAt).getTime();
      });
    }
    return list;
  }, [workspaces, query]);

  useEffect(() => {
    setSelectedIndex((prev) => (filtered.length > 0 ? Math.min(prev, filtered.length - 1) : 0));
  }, [filtered.length]);

  const handleClose = () => {
    desktopApi.window.closeLauncher().catch(() => {});
  };

  const handleLaunch = async (id: string) => {
    try {
      await desktopApi.launch.start(id);
      handleClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to launch workspace', 'error');
    }
  };


  const handleOpenSettings = async () => {
    try {
      await desktopApi.window.openMainDashboard();
      handleClose();
    } catch {
      // fallback
    }
  };

  const handleOpenNotes = async () => {
    try {
      await desktopApi.window.openMainDashboard();
      handleClose();
    } catch {
      // fallback
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (e.buttons === 1 && !target.closest('input') && !target.closest('button')) {
      desktopApi.window.startDragging().catch(() => {});
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleLaunch(filtered[selectedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const getWorkspaceCategory = (ws: WorkspaceDTO) => {
    const lower = ws.name.toLowerCase();
    if (lower.includes('dev') || lower.includes('code') || ws.icon === 'code' || ws.icon === 'terminal') {
      return { icon: <Code2 size={16} strokeWidth={2} />, typeClass: styles.iconDev };
    }
    if (lower.includes('study') || lower.includes('learn') || ws.icon === 'book' || ws.icon === 'graduation-cap') {
      return { icon: <GraduationCap size={16} strokeWidth={2} />, typeClass: styles.iconStudy };
    }
    if (lower.includes('job') || lower.includes('work') || ws.icon === 'briefcase') {
      return { icon: <Briefcase size={16} strokeWidth={2} />, typeClass: styles.iconWork };
    }
    return { icon: <Layers size={16} strokeWidth={2} />, typeClass: styles.iconDefault };
  };

  const getItemSubtitle = (ws: WorkspaceDTO) => {
    if (ws.items && ws.items.length > 0) {
      return ws.items.map((i) => i.name).filter(Boolean).slice(0, 3).join(' · ');
    }
    return ws.description || `${ws.itemCount} ${ws.itemCount === 1 ? 'item' : 'items'}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header Search with Drag Handle */}
        <div
          className={styles.searchHeader}
          data-tauri-drag-region
          onMouseDown={handleHeaderMouseDown}
        >
          <Search size={15} strokeWidth={2} className={styles.searchIcon} data-tauri-drag-region />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search workspace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className={styles.shortcutBadge}>Ctrl + Space</span>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Workspace result list */}
        <div className={styles.resultsList}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <Layers size={20} strokeWidth={1.5} className={styles.emptyIcon} />
              <span>No workspaces match "{query}"</span>
            </div>
          ) : (
            filtered.map((ws, idx) => {
              const isSelected = idx === selectedIndex;
              const { icon, typeClass } = getWorkspaceCategory(ws);
              const subtitle = getItemSubtitle(ws);

              return (
                <div
                  key={ws.id}
                  className={`${styles.resultRow} ${isSelected ? styles.resultRowActive : ''}`}
                  onClick={() => handleLaunch(ws.id)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className={`${styles.iconBox} ${typeClass}`}>
                    {icon}
                  </div>

                  <div className={styles.itemInfo}>
                    <div className={styles.titleLine}>
                      <span className={styles.itemName}>{ws.name}</span>
                      {ws.isFavorite && (
                        <Star size={11} fill="#f59e0b" color="#f59e0b" />
                      )}
                    </div>
                    <span className={styles.itemDesc}>{subtitle}</span>
                  </div>

                  <div className={styles.itemRight}>
                    <button
                      className={`${styles.playBtn} ${isSelected ? styles.playBtnActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunch(ws.id);
                      }}
                      title={`Launch ${ws.name}`}
                      aria-label={`Launch ${ws.name}`}
                    >
                      <Play size={11} fill="currentColor" strokeWidth={0} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Utility Actions (Mockup: Quick Notes, Settings, Capture) */}
        <div className={styles.quickActionsSection}>
          <button className={styles.actionRow} onClick={handleOpenNotes}>
            <FileText size={14} strokeWidth={1.8} className={styles.actionIcon} />
            <span className={styles.actionLabel}>Open Quick Notes</span>
            <span className={styles.actionBadge}>Ctrl + N</span>
          </button>

          <button className={styles.actionRow} onClick={handleCaptureDesktop}>
            <Camera size={14} strokeWidth={1.8} className={styles.actionIcon} />
            <span className={styles.actionLabel}>Capture Desktop Workspace</span>
            <span className={styles.actionBadge}>Ctrl + Shift + C</span>
          </button>

          <button className={styles.actionRow} onClick={handleOpenSettings}>
            <Settings size={14} strokeWidth={1.8} className={styles.actionIcon} />
            <span className={styles.actionLabel}>Open Settings & Workspaces</span>
            <span className={styles.actionBadge}>Ctrl + ,</span>
          </button>
        </div>

        {/* Footer */}
        <div
          className={styles.footer}
          data-tauri-drag-region
          onMouseDown={handleHeaderMouseDown}
        >
          <div className={styles.brandTag} data-tauri-drag-region>
            <span className={styles.brandDot} />
            <span data-tauri-drag-region>DeskPilot</span>
          </div>
          <span className={styles.closeHint} data-tauri-drag-region>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
