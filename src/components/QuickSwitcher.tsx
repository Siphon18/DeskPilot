import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Star, Layers, Code2, GraduationCap, Briefcase, Play, Settings, FileText, Camera, LayoutDashboard } from 'lucide-react';
import type { WorkspaceDTO } from '../lib/types';
import styles from './QuickSwitcher.module.css';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: WorkspaceDTO[];
  onLaunch: (id: string) => void;
  onOpenNotes?: () => void;
  onOpenSettings?: () => void;
  onOpenDashboard?: () => void;
  onCaptureCurrent?: () => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  onClose,
  workspaces,
  onLaunch,
  onOpenNotes,
  onOpenSettings,
  onOpenDashboard,
  onCaptureCurrent,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Filter & group workspaces: when query is empty, prioritize Favorites then Recently Launched
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

  if (!isOpen) return null;

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
        onLaunch(filtered[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
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
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Search header (Section 6.6: prominent search field with immediate focus) */}
        <div className={styles.searchHeader}>
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
        </div>

        {/* Workspace result rows */}
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
                  onClick={() => {
                    onLaunch(ws.id);
                    onClose();
                  }}
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
                        onLaunch(ws.id);
                        onClose();
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

        {/* Quick Utility Actions Divider & Rows (Mockup Reference) */}
        <div className={styles.quickActionsSection}>
          {onCaptureCurrent && (
            <button
              className={styles.actionRow}
              onClick={() => {
                onCaptureCurrent();
                onClose();
              }}
            >
              <Camera size={14} className={styles.actionIcon} />
              <span className={styles.actionLabel}>Capture Current Desktop</span>
              <span className={styles.actionBadge}>Ctrl + Shift + C</span>
            </button>
          )}

          {onOpenNotes && (
            <button
              className={styles.actionRow}
              onClick={() => {
                onOpenNotes();
                onClose();
              }}
            >
              <FileText size={14} className={styles.actionIcon} />
              <span className={styles.actionLabel}>Open Quick Notes</span>
              <span className={styles.actionBadge}>Ctrl + N</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              className={styles.actionRow}
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
            >
              <Settings size={14} className={styles.actionIcon} />
              <span className={styles.actionLabel}>Open Settings</span>
              <span className={styles.actionBadge}>Ctrl + ,</span>
            </button>
          )}

          {onOpenDashboard && (
            <button
              className={styles.actionRow}
              onClick={() => {
                onOpenDashboard();
              }}
            >
              <LayoutDashboard size={14} className={styles.actionIcon} />
              <span className={styles.actionLabel}>Open Full Dashboard</span>
              <span className={styles.actionBadge}>Ctrl + D</span>
            </button>
          )}
        </div>

        {/* Footer shortcuts hint (Section 6.6) */}
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
