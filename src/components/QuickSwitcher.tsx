import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Star, Play, CornerDownLeft } from 'lucide-react';
import type { WorkspaceDTO } from '../lib/types';
import { IconRenderer, AVAILABLE_COLORS } from './IconRenderer';
import styles from './QuickSwitcher.module.css';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: WorkspaceDTO[];
  onLaunch: (id: string) => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  onClose,
  workspaces,
  onLaunch,
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
      // Group: favorites first, then recently launched
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

  // Adjust selectedIndex when list changes
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Type a workspace name to launch..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className={styles.shortcutHint}>ESC to close</span>
        </div>

        <div className={styles.resultsList}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No workspaces match your search</div>
          ) : (
            filtered.map((ws, idx) => {
              const colorMeta =
                AVAILABLE_COLORS.find((c) => c.id === ws.color) || AVAILABLE_COLORS[0];
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={ws.id}
                  className={`${styles.itemRow} ${isSelected ? styles.itemRowActive : ''}`}
                  onClick={() => {
                    onLaunch(ws.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div
                    className={styles.itemIcon}
                    style={{ backgroundColor: `${colorMeta.hex}18`, color: colorMeta.hex }}
                  >
                    <IconRenderer name={ws.icon} size={16} color={colorMeta.hex} />
                  </div>

                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>
                      <span>{ws.name}</span>
                      {ws.isFavorite && <Star size={12} fill="#ffaa00" color="#ffaa00" />}
                    </span>
                    <span className={styles.itemDesc}>
                      {ws.description || `${ws.itemCount} items`}
                    </span>
                  </div>

                  {isSelected && (
                    <div className={styles.itemEnterHint}>
                      <Play size={12} fill="currentColor" />
                      <span>Launch</span>
                      <CornerDownLeft size={12} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.keyHints}>
            <span className={styles.keyHint}>
              <span className={styles.keyBadge}>↑</span>
              <span className={styles.keyBadge}>↓</span> to navigate
            </span>
            <span className={styles.keyHint}>
              <span className={styles.keyBadge}>↵</span> to launch
            </span>
            <span className={styles.keyHint}>
              <span className={styles.keyBadge}>esc</span> to dismiss
            </span>
          </div>
          <span>DeskPilot Quick Switcher</span>
        </div>
      </div>
    </div>
  );
};
