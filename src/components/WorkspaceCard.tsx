import React, { useState, useRef, useEffect } from 'react';
import { Play, Star, MoreVertical, Copy, Trash2, Edit3, Folder, Code2, GraduationCap, Briefcase, Layers } from 'lucide-react';
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

  const getWorkspaceColor = () => {
    const lowerName = workspace.name.toLowerCase();
    if (lowerName.includes('dev') || lowerName.includes('code') || workspace.color === 'blue' || workspace.color === '#3b82f6') {
      return '#38bdf8';
    }
    if (lowerName.includes('study') || lowerName.includes('learn') || workspace.color === 'purple' || workspace.color === '#8b5cf6') {
      return '#a855f7';
    }
    if (lowerName.includes('job') || lowerName.includes('work') || workspace.color === 'green' || workspace.color === '#10b981') {
      return '#10b981';
    }
    if (workspace.color === 'orange' || workspace.color === '#f97316') return '#fb923c';
    if (workspace.color === 'pink' || workspace.color === '#ec4899') return '#f472b6';
    return '#3b82f6';
  };

  const getCardIcon = () => {
    const lowerName = workspace.name.toLowerCase();
    if (lowerName.includes('dev') || lowerName.includes('code') || workspace.icon === 'code' || workspace.icon === 'terminal') {
      return <Code2 size={20} />;
    }
    if (lowerName.includes('study') || lowerName.includes('learn') || workspace.icon === 'book' || workspace.icon === 'graduation-cap') {
      return <GraduationCap size={20} />;
    }
    if (lowerName.includes('job') || lowerName.includes('work') || workspace.icon === 'briefcase') {
      return <Briefcase size={20} />;
    }
    return <Layers size={20} />;
  };

  const accentColor = getWorkspaceColor();

  return (
    <div
      className={styles.card}
      onClick={() => onOpenDetail?.(workspace.id)}
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className={styles.cardHeader}>
        <div
          className={styles.iconBox}
          style={{
            backgroundColor: `${accentColor}1c`,
            color: accentColor,
          }}
        >
          {getCardIcon()}
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
            <Star size={16} fill={workspace.isFavorite ? '#ffaa00' : 'none'} color={workspace.isFavorite ? '#ffaa00' : '#64748b'} />
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

      <div className={styles.contentArea}>
        <h3 className={styles.title} title={workspace.name}>
          {workspace.name}
        </h3>
        <p className={styles.subtitle} title={workspace.description}>
          {workspace.description || (workspace.itemCount > 0 ? `${workspace.itemCount} items configured` : 'Ready to launch')}
        </p>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.itemBadge}>
          <Folder size={12} className={styles.itemBadgeIcon} />
          <span>{workspace.itemCount} {workspace.itemCount === 1 ? 'item' : 'items'}</span>
        </div>

        <button
          className={styles.playButton}
          onClick={(e) => {
            e.stopPropagation();
            onLaunch(workspace.id);
          }}
          title={`Launch ${workspace.name} (1-click)`}
          aria-label={`Launch ${workspace.name}`}
        >
          <Play size={14} fill="#ffffff" color="#ffffff" />
        </button>
      </div>
    </div>
  );
};
