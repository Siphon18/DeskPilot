import React, { useState, useEffect } from 'react';
import { Plus, Camera, Star, Layers, History, Clock, Zap, Settings, ArrowRight } from 'lucide-react';
import type { WorkspaceDTO, LaunchRunDTO } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import { WorkspaceCard } from '../../components/WorkspaceCard';
import styles from './OverviewView.module.css';

interface OverviewViewProps {
  workspaces: WorkspaceDTO[];
  onOpenCreate: () => void;
  onLaunch: (id: string) => void;
  onLaunchLast?: () => void;
  onEdit: (workspace: WorkspaceDTO) => void;
  onDuplicate: (id: string) => void;
  onDelete: (workspace: WorkspaceDTO) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onOpenDetail: (id: string) => void;
  onCaptureCurrent: () => Promise<void>;
  onNavigateTab: (tab: 'overview' | 'workspaces' | 'activity' | 'settings') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  workspaces,
  onOpenCreate,
  onLaunch,
  onLaunchLast,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onOpenDetail,
  onCaptureCurrent,
  onNavigateTab,
}) => {
  const [recentRuns, setRecentRuns] = useState<LaunchRunDTO[]>([]);
  const favorites = workspaces.filter((w) => w.isFavorite);

  // Load actual launch runs from SQLite
  useEffect(() => {
    desktopApi.launch.listRuns(5).then((runs) => {
      setRecentRuns(runs || []);
    }).catch(() => {
      setRecentRuns([]);
    });
  }, [workspaces]);

  const formatRunTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.container}>
      {/* Header row (Section 6.6) */}
      <div className={styles.header}>
        <div className={styles.headingArea}>
          <h1 className={styles.title}>Your Workspaces</h1>
          <p className={styles.subtitle}>Launch the apps and resources for a task in one click.</p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryBtn}
            onClick={onCaptureCurrent}
            title="Snapshot currently open visible user applications into a workspace in one click (Ctrl+Shift+C)"
          >
            <Camera size={15} />
            <span>Capture desktop</span>
          </button>

          <button className={styles.primaryBtn} onClick={onOpenCreate}>
            <Plus size={16} />
            <span>New workspace</span>
          </button>
        </div>
      </div>

      {workspaces.length === 0 ? (
        /* Empty State (Section 6.6) */
        <div className={styles.emptyState}>
          <div className={styles.emptyIconBox}>
            <Layers size={28} strokeWidth={1.5} />
          </div>
          <h2 className={styles.emptyTitle}>No workspaces created yet</h2>
          <p className={styles.emptyText}>
            DeskPilot organizes your daily apps, project folders, web URLs, and terminals into fast one-click workspaces.
          </p>
          <div className={styles.emptyActions}>
            <button className={styles.primaryBtn} onClick={onOpenCreate}>
              <Plus size={16} />
              <span>Create workspace</span>
            </button>
            <button className={styles.secondaryBtn} onClick={onCaptureCurrent}>
              <Camera size={15} />
              <span>Capture desktop</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Favorites, only if at least one workspace is favorited */}
          {favorites.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Star size={15} className={styles.sectionIcon} />
                  <span>Favorites</span>
                  <span className={styles.counterBadge}>{favorites.length}</span>
                </h2>
              </div>
              <div className={styles.grid}>
                {favorites.map((w) => (
                  <WorkspaceCard
                    key={w.id}
                    workspace={w}
                    onLaunch={onLaunch}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 2. All workspaces */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span>All workspaces</span>
                <span className={styles.counterBadge}>{workspaces.length}</span>
              </h2>
            </div>
            <div className={styles.grid}>
              {workspaces.map((w) => (
                <WorkspaceCard
                  key={w.id}
                  workspace={w}
                  onLaunch={onLaunch}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          </section>

          {/* 3. Quick Actions Row (Mockup Reference: Launch Last, Capture, New, Settings) */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Zap size={15} className={styles.sectionIcon} />
                <span>Quick Actions</span>
              </h2>
            </div>
            <div className={styles.quickActionsGrid}>
              <button
                className={styles.quickActionCard}
                onClick={onLaunchLast}
                title="Launch the most recently launched workspace (Ctrl + Shift + L)"
              >
                <div className={`${styles.quickActionIcon} ${styles.quickActionIconZap}`}>
                  <Zap size={16} />
                </div>
                <div className={styles.quickActionText}>
                  <span className={styles.quickActionTitle}>Launch Last Workspace</span>
                  <span className={styles.quickActionShortcut}>Ctrl + Shift + L</span>
                </div>
              </button>

              <button
                className={styles.quickActionCard}
                onClick={onCaptureCurrent}
                title="Snapshot open windows into a new workspace (Ctrl + Shift + C)"
              >
                <div className={`${styles.quickActionIcon} ${styles.quickActionIconCamera}`}>
                  <Camera size={16} />
                </div>
                <div className={styles.quickActionText}>
                  <span className={styles.quickActionTitle}>Capture Desktop</span>
                  <span className={styles.quickActionShortcut}>Ctrl + Shift + C</span>
                </div>
              </button>

              <button
                className={styles.quickActionCard}
                onClick={onOpenCreate}
                title="Create a custom workspace (Ctrl + N)"
              >
                <div className={`${styles.quickActionIcon} ${styles.quickActionIconPlus}`}>
                  <Plus size={16} />
                </div>
                <div className={styles.quickActionText}>
                  <span className={styles.quickActionTitle}>New Workspace</span>
                  <span className={styles.quickActionShortcut}>Ctrl + N</span>
                </div>
              </button>

              <button
                className={styles.quickActionCard}
                onClick={() => onNavigateTab('settings')}
                title="Configure DeskPilot settings (Ctrl + ,)"
              >
                <div className={`${styles.quickActionIcon} ${styles.quickActionIconSettings}`}>
                  <Settings size={16} />
                </div>
                <div className={styles.quickActionText}>
                  <span className={styles.quickActionTitle}>Settings</span>
                  <span className={styles.quickActionShortcut}>Ctrl + ,</span>
                </div>
              </button>
            </div>
          </section>

          {/* 4. Recent launches, backed by SQLite launch runs */}
          {recentRuns.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <History size={15} className={styles.sectionIcon} />
                  <span>Recent Activity</span>
                </h2>
                <button
                  className={styles.viewHistoryLink}
                  onClick={() => onNavigateTab('activity')}
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className={styles.recentList}>
                {recentRuns.map((run) => (
                  <div key={run.id} className={styles.recentRow}>
                    <div className={styles.recentInfo}>
                      <span className={styles.recentWorkspaceName}>
                        {run.workspaceNameSnapshot}
                      </span>
                      <span className={styles.recentCounts}>
                        {run.successCount} of {run.totalCount} items launched
                      </span>
                    </div>
                    <div className={styles.recentMeta}>
                      <Clock size={12} />
                      <span>{formatRunTime(run.startedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
