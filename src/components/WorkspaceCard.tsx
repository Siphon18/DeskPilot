import React, { useState, useRef, useEffect } from 'react';
import { Play, Star, MoreVertical, Copy, Trash2, Edit3, Folder, Clock, Layers, Code2, GraduationCap, Briefcase } from 'lucide-react';
import type { WorkspaceDTO } from '../lib/types';
import styles from './WorkspaceCard.module.css';

interface WorkspaceCardProps {
  workspace: WorkspaceDTO;
  onLaunch: (id: string) => void;
  onEdit: (workspace: WorkspaceDTO) => void;
  onDuplicate: (id: string) => void;
  onDelete: (workspace: WorkspaceDTO) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onOpenDetail?: (id: string) => void;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onOpenDetail,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const formatLastLaunched = (iso: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getWorkspaceCategory = () => {
    const lower = workspace.name.toLowerCase();
    if (lower.includes('dev') || lower.includes('code') || workspace.icon === 'code' || workspace.icon === 'terminal') {
      return { icon: <Code2 size={18} strokeWidth={2} />, typeClass: styles.iconDev };
    }
    if (lower.includes('study') || lower.includes('learn') || workspace.icon === 'book' || workspace.icon === 'graduation-cap') {
      return { icon: <GraduationCap size={18} strokeWidth={2} />, typeClass: styles.iconStudy };
    }
    if (lower.includes('job') || lower.includes('work') || workspace.icon === 'briefcase') {
      return { icon: <Briefcase size={18} strokeWidth={2} />, typeClass: styles.iconWork };
    }
    return { icon: <Layers size={18} strokeWidth={2} />, typeClass: styles.iconDefault };
  };

  // Derive apps preview (e.g. "VS Code · Browser · Terminal") matching design mockup
  const getItemSubtitle = () => {
    if (workspace.items && workspace.items.length > 0) {
      return workspace.items.map((i) => i.name).filter(Boolean).slice(0, 3).join(' · ');
    }
    return workspace.description || `${workspace.itemCount} ${workspace.itemCount === 1 ? 'item' : 'items'}`;
  };

  const { icon, typeClass } = getWorkspaceCategory();
  const lastLaunched = formatLastLaunched(workspace.lastLaunchedAt);
  const subtitle = getItemSubtitle();

  return (
    <div
      className={styles.card}
      onClick={() => onOpenDetail?.(workspace.id)}
    >
      {/* Top Header: Identity Icon, Title, Subtitle, Favorite & Overflow Menu */}
      <div className={styles.cardHeader}>
        <div className={styles.iconAndTitle}>
          <div className={`${styles.iconBox} ${typeClass}`}>
            {icon}
          </div>
          <div className={styles.titleArea}>
            <h3 className={styles.title} title={workspace.name}>
              {workspace.name}
            </h3>
            <p className={styles.subtitle} title={subtitle}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className={styles.headerActions} ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            className={`${styles.iconBtn} ${workspace.isFavorite ? styles.favActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(workspace.id, workspace.isFavorite);
            }}
            title={workspace.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Favorite toggle"
          >
            <Star
              size={15}
              fill={workspace.isFavorite ? 'currentColor' : 'none'}
              strokeWidth={1.8}
            />
          </button>

          <button
            className={styles.iconBtn}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            title="More options"
            aria-label="Workspace options"
          >
            <MoreVertical size={16} strokeWidth={1.8} />
          </button>

          {menuOpen && (
            <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(workspace);
                }}
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>

              <button
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate(workspace.id);
                }}
              >
                <Copy size={14} />
                <span>Duplicate</span>
              </button>

              <button
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(workspace);
                }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Metadata (item count, last launched) & Clear Launch Button */}
      <div className={styles.cardFooter}>
        <div className={styles.metaRow}>
          <span className={styles.itemBadge}>
            <Folder size={13} strokeWidth={1.8} />
            <span>{workspace.itemCount} {workspace.itemCount === 1 ? 'item' : 'items'}</span>
          </span>

          {lastLaunched && (
            <span className={styles.lastLaunched} title={workspace.lastLaunchedAt || undefined}>
              <Clock size={12} strokeWidth={1.8} />
              <span>{lastLaunched}</span>
            </span>
          )}
        </div>

        <button
          className={styles.launchBtn}
          onClick={(e) => {
            e.stopPropagation();
            onLaunch(workspace.id);
          }}
          title={`Launch ${workspace.name}`}
          aria-label={`Launch ${workspace.name}`}
        >
          <Play size={12} fill="currentColor" strokeWidth={0} />
          <span>Launch</span>
        </button>
      </div>
    </div>
  );
};
