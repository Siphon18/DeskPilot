import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Play, FileText, Settings, Camera, Code2, GraduationCap, Briefcase, Layers } from 'lucide-react';
import type { WorkspaceDTO } from '../lib/types';
import styles from './QuickSwitcher.module.css';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: WorkspaceDTO[];
  onLaunch: (id: string) => void;
  onOpenNotes?: () => void;
  onOpenSettings?: () => void;
  onCaptureCurrent?: () => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  onClose,
  workspaces,
  onLaunch,
  onOpenNotes,
  onOpenSettings,
  onCaptureCurrent,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    let list = [...workspaces];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
      );
    } else {
      // Favorites first, then most recently launched
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

  const getWorkspaceIcon = (name: string, iconKey: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('dev') || lower.includes('code') || iconKey === 'terminal' || iconKey === 'code') {
      return <Code2 size={18} />;
    }
    if (lower.includes('study') || lower.includes('learn') || iconKey === 'book' || iconKey === 'book-open') {
      return <GraduationCap size={18} />;
    }
    if (lower.includes('job') || lower.includes('work') || lower.includes('career') || iconKey === 'briefcase') {
      return <Briefcase size={18} />;
    }
    return <Layers size={18} />;
  };

  const getAccentColor = (ws: WorkspaceDTO, idx: number) => {
    if (ws.color === 'blue' || ws.color === '#3b82f6') return '#38bdf8';
    if (ws.color === 'purple' || ws.color === '#8b5cf6') return '#c084fc';
    if (ws.color === 'green' || ws.color === '#10b981') return '#34d399';
    if (ws.color === 'orange' || ws.color === '#f97316') return '#fb923c';
    if (ws.color === 'pink' || ws.color === '#ec4899') return '#f472b6';
    const fallbackPalette = ['#38bdf8', '#c084fc', '#34d399', '#fb923c'];
    return fallbackPalette[idx % fallbackPalette.length];
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Search header with Ctrl + Space badge */}
        <div className={styles.searchHeader}>
          <Search size={18} className={styles.searchIcon} />
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

        {/* Workspace cards list */}
        <div className={styles.resultsList}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No workspaces found</div>
          ) : (
            filtered.map((ws, idx) => {
              const isSelected = idx === selectedIndex;
              const accentColor = getAccentColor(ws, idx);

              return (
                <div
                  key={ws.id}
                  className={`${styles.workspaceCard} ${isSelected ? styles.workspaceCardActive : ''}`}
                  onClick={() => {
                    onLaunch(ws.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div
                    className={styles.iconBox}
                    style={{
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : `${accentColor}20`,
                      color: isSelected ? '#ffffff' : accentColor,
                    }}
                  >
                    {getWorkspaceIcon(ws.name, ws.icon)}
                  </div>

                  <div className={styles.cardInfo}>
                    <span className={styles.cardTitle}>{ws.name}</span>
                    <span className={styles.cardSubtitle}>
                      {ws.description || (ws.itemCount > 0 ? `${ws.itemCount} configured apps` : 'Ready to launch')}
                    </span>
                  </div>

                  <button
                    className={`${styles.playButton} ${isSelected ? styles.playButtonActive : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunch(ws.id);
                      onClose();
                    }}
                    title="Launch workspace in 1 click"
                    aria-label={`Launch ${ws.name}`}
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.divider} />

        {/* Quick Actions row */}
        <div className={styles.quickActions}>
          {onCaptureCurrent && (
            <button
              className={styles.actionRow}
              onClick={() => {
                onCaptureCurrent();
                onClose();
              }}
            >
              <div className={styles.actionLeft}>
                <Camera size={16} className={styles.actionIcon} />
                <span>1-Click Capture Desktop</span>
              </div>
              <span className={styles.actionBadge}>Ctrl + Shift + C</span>
            </button>
          )}

          <button
            className={styles.actionRow}
            onClick={() => {
              onOpenNotes?.();
              onClose();
            }}
          >
            <div className={styles.actionLeft}>
              <FileText size={16} className={styles.actionIcon} />
              <span>Open Quick Notes</span>
            </div>
            <span className={styles.actionBadge}>Ctrl + N</span>
          </button>

          <button
            className={styles.actionRow}
            onClick={() => {
              onOpenSettings?.();
              onClose();
            }}
          >
            <div className={styles.actionLeft}>
              <Settings size={16} className={styles.actionIcon} />
              <span>Open Settings</span>
            </div>
            <span className={styles.actionBadge}>Ctrl + ,</span>
          </button>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerBrand}>
            <span className={styles.footerDot} />
            <span className={styles.footerBrandText}>DeskPilot</span>
          </div>
          <span className={styles.footerDismiss}>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
