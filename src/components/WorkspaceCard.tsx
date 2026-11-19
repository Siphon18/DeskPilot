import React, { useState, useRef, useEffect } from 'react';
import { Play, Star, MoreVertical, Copy, Trash2, Edit3, Layers, Clock } from 'lucide-react';
import type { WorkspaceDTO } from '../lib/types';
import { IconRenderer, AVAILABLE_COLORS } from './IconRenderer';
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

  // Close menu on click outside
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

  const colorMeta = AVAILABLE_COLORS.find((c) => c.id === workspace.color) || AVAILABLE_COLORS[0];

  const formatLastLaunched = (iso: string | null) => {
    if (!iso) return 'Never launched';
    const date = new Date(iso);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div
          className={styles.iconAndTitle}
          onClick={() => onOpenDetail?.(workspace.id)}
          style={{ cursor: onOpenDetail ? 'pointer' : 'default' }}
        >
          <div
            className={styles.iconBox}
            style={{
              backgroundColor: `${colorMeta.hex}18`,
              color: colorMeta.hex,
            }}
          >
            <IconRenderer name={workspace.icon} size={22} color={colorMeta.hex} />
          </div>
          <div className={styles.titleArea}>
            <h3 className={styles.title} title={workspace.name}>
              {workspace.name}
            </h3>
            <p className={styles.description} title={workspace.description}>
              {workspace.description || 'No description provided.'}
            </p>
          </div>
        </div>

        <div className={styles.headerActions} ref={menuRef}>
          <button
            className={`${styles.iconBtn} ${workspace.isFavorite ? styles.favActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(workspace.id, workspace.isFavorite);
            }}
            title={workspace.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Favorite toggle"
          >
            <Star size={16} fill={workspace.isFavorite ? '#ffaa00' : 'none'} />
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
            <MoreVertical size={16} />
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
                <span>Edit details</span>
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

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <Layers size={13} />
          <span>{workspace.itemCount} {workspace.itemCount === 1 ? 'item' : 'items'}</span>
        </span>
        <span className={styles.metaItem} title={workspace.lastLaunchedAt || undefined}>
          <Clock size={13} />
          <span>{formatLastLaunched(workspace.lastLaunchedAt)}</span>
        </span>
      </div>

      <div className={styles.cardFooter}>
        <button
          className={styles.launchBtn}
          onClick={() => onLaunch(workspace.id)}
          title={`Launch ${workspace.name}`}
        >
          <Play size={14} fill="currentColor" />
          <span>Launch</span>
        </button>

        {onOpenDetail && (
          <button
            className={styles.editBtn}
            onClick={() => onOpenDetail(workspace.id)}
            title="Open workspace setup"
          >
            Manage
          </button>
        )}
      </div>
    </div>
  );
};
