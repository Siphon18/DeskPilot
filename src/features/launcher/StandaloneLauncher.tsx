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
  X,
} from 'lucide-react';
import type { WorkspaceDTO } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import { useToast } from '../../components/Toast';
import styles from './StandaloneLauncher.module.css';

export const StandaloneLauncher: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Load workspaces on mount & listen for refresh events
  const loadWorkspaces = async () => {
    try {
      const data = await desktopApi.workspaces.list();
      setWorkspaces(data);
    } catch {
      // silently fallback
    }
  };

  useEffect(() => {
    loadWorkspaces();
    // Focus search input
    setTimeout(() => inputRef.current?.focus(), 50);

    // Dynamic accent color from Windows Registry
    desktopApi.settings.getWindowsThemeColor().then((color) => {
      const root = document.documentElement;
      root.style.setProperty('--win-accent', color.hex);
      root.style.setProperty('--win-accent-rgb', `${color.r}, ${color.g}, ${color.b}`);
      root.style.setProperty('--win-accent-glow', color.accentGlow);
      root.style.setProperty('--win-accent-subtle', color.accentSubtle);
      root.style.setProperty('--win-accent-highlight', color.liquidHighlight);
      root.style.setProperty('--win-accent-border', `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
    }).catch(() => {});
  }, []);

  // Filter workspaces
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
      // Immediately hide launcher back into background
      handleClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to launch workspace', 'error');
    }
  };

  const handleCaptureDesktop = async () => {
    try {
      const created = await desktopApi.workspaces.captureCurrent();
      showToast(`Captured "${created.name}" with ${created.items.length} apps`, 'success');
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to capture desktop', 'error');
    }
  };

  const handleOpenSettings = async () => {
    try {
      await desktopApi.window.openMainDashboard();
    } catch {
      // fallback
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
      <div className={styles.card} data-tauri-drag-region>
        {/* Search header with instant focus */}
        <div className={styles.searchHeader} data-tauri-drag-region>
          <Search size={16} className={styles.searchIcon} />
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
          <button className={styles.closeBtn} onClick={handleClose} title="Close (Esc)">
            <X size={14} />
          </button>
        </div>

        {/* Workspace result list */}
        <div className={styles.resultsList}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No workspaces match "{query}"</div>
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
                      <Play size={12} fill="currentColor" strokeWidth={0} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Utility Actions Divider & Rows */}
        <div className={styles.quickActionsSection}>
          <button className={styles.actionRow} onClick={handleCaptureDesktop}>
            <Camera size={14} className={styles.actionIcon} />
            <span className={styles.actionLabel}>Capture Desktop Workspace</span>
            <span className={styles.actionBadge}>Ctrl + Shift + C</span>
          </button>

          <button className={styles.actionRow} onClick={handleOpenSettings}>
            <Settings size={14} className={styles.actionIcon} />
            <span className={styles.actionLabel}>Open Settings & Workspaces</span>
            <span className={styles.actionBadge}>Settings</span>
          </button>
        </div>

        {/* Footer shortcuts hint */}
        <div className={styles.footer}>
          <div className={styles.brandTag}>
            <span className={styles.brandDot} />
            <span>DeskPilot</span>
          </div>
          <span className={styles.closeHint}>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
