import React, { useMemo } from 'react';
import { Plus, Zap, FileText, FolderOpen, Settings, ChevronRight, Code2, Camera } from 'lucide-react';
import type { WorkspaceDTO } from '../../lib/types';
import { WorkspaceCard } from '../../components/WorkspaceCard';
import styles from './OverviewView.module.css';

interface OverviewViewProps {
  workspaces: WorkspaceDTO[];
  onOpenCreate: () => void;
  onLaunch: (id: string) => void;
  onEdit: (workspace: WorkspaceDTO) => void;
  onDuplicate: (id: string) => void;
  onDelete: (workspace: WorkspaceDTO) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onOpenDetail: (id: string) => void;
  onCaptureCurrent: () => Promise<void>;
  onNavigateTab: (tab: 'overview' | 'workspaces' | 'notes' | 'settings' | 'about') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  workspaces,
  onOpenCreate,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onOpenDetail,
  onCaptureCurrent,
  onNavigateTab,
}) => {
  // Determine dynamic greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning!';
    if (hour < 18) return 'Good Afternoon!';
    return 'Good Evening!';
  }, []);

  const handleLaunchLast = () => {
    if (workspaces.length === 0) return;
    const sorted = [...workspaces].sort((a, b) => {
      if (!a.lastLaunchedAt) return 1;
      if (!b.lastLaunchedAt) return -1;
      return new Date(b.lastLaunchedAt).getTime() - new Date(a.lastLaunchedAt).getTime();
    });
    onLaunch(sorted[0].id);
  };

  return (
    <div className={styles.container}>
      {/* Hero Banner with illustration */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{greeting}</h1>
          <p className={styles.heroSubtitle}>What would you like to work on today?</p>
        </div>

        {/* 3D-styled Laptop & Plant Visual Graphic matching reference */}
        <div className={styles.heroIllustration}>
          <div className={styles.plantWrapper}>
            <div className={styles.plantPot}>
              <div className={styles.leaf1} />
              <div className={styles.leaf2} />
              <div className={styles.leaf3} />
            </div>
          </div>

          <div className={styles.laptopWrapper}>
            <div className={styles.laptopScreen}>
              <div className={styles.screenGlow} />
              <div className={styles.winLogo}>
                <div className={styles.winTile} />
                <div className={styles.winTile} />
                <div className={styles.winTile} />
                <div className={styles.winTile} />
              </div>
            </div>
            <div className={styles.laptopBase} />
          </div>
        </div>
      </div>

      {/* Your Workspaces Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Your Workspaces</h2>

          <div className={styles.headerButtons}>
            <button
              className={styles.captureBtn}
              onClick={onCaptureCurrent}
              title="Capture open application windows and save as a workspace with 1 click"
            >
              <Camera size={15} />
              <span>1-Click Capture Desktop</span>
            </button>

            <button className={styles.primaryBtn} onClick={onOpenCreate}>
              <Plus size={16} />
              <span>New Workspace</span>
            </button>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className={styles.emptyStateCard}>
            <p className={styles.emptyTitle}>No workspaces yet</p>
            <p className={styles.emptyText}>
              Click <strong>1-Click Capture Desktop</strong> to snapshot all currently open apps, or click <strong>New Workspace</strong> to start fresh.
            </p>
          </div>
        ) : (
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
        )}
      </section>

      {/* Quick Actions Row */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
        </div>

        <div className={styles.quickActionsGrid}>
          <div className={styles.actionCard} onClick={handleLaunchLast}>
            <div className={`${styles.actionIconBox} ${styles.amberIcon}`}>
              <Zap size={18} fill="currentColor" />
            </div>
            <div className={styles.actionDetails}>
              <span className={styles.actionName}>Launch Last Workspace</span>
              <div className={styles.actionKbdRow}>
                <span className={styles.actionKbd}>Ctrl</span>
                <span className={styles.actionKbd}>+</span>
                <span className={styles.actionKbd}>Shift</span>
                <span className={styles.actionKbd}>+</span>
                <span className={styles.actionKbd}>L</span>
              </div>
            </div>
          </div>

          <div className={styles.actionCard} onClick={() => onNavigateTab('notes')}>
            <div className={`${styles.actionIconBox} ${styles.yellowIcon}`}>
              <FileText size={18} />
            </div>
            <div className={styles.actionDetails}>
              <span className={styles.actionName}>Add Note</span>
              <div className={styles.actionKbdRow}>
                <span className={styles.actionKbd}>Ctrl</span>
                <span className={styles.actionKbd}>+</span>
                <span className={styles.actionKbd}>N</span>
              </div>
            </div>
          </div>

          <div
            className={styles.actionCard}
            onClick={() => onNavigateTab('workspaces')}
          >
            <div className={`${styles.actionIconBox} ${styles.goldIcon}`}>
              <FolderOpen size={18} />
            </div>
            <div className={styles.actionDetails}>
              <span className={styles.actionName}>Open Folder</span>
              <div className={styles.actionKbdRow}>
                <span className={styles.actionKbd}>Ctrl</span>
                <span className={styles.actionKbd}>+</span>
                <span className={styles.actionKbd}>O</span>
              </div>
            </div>
          </div>

          <div className={styles.actionCard} onClick={() => onNavigateTab('settings')}>
            <div className={`${styles.actionIconBox} ${styles.blueIcon}`}>
              <Settings size={18} />
            </div>
            <div className={styles.actionDetails}>
              <span className={styles.actionName}>Settings</span>
              <div className={styles.actionKbdRow}>
                <span className={styles.actionKbd}>Ctrl</span>
                <span className={styles.actionKbd}>+</span>
                <span className={styles.actionKbd}>,</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Row */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <button
            className={styles.viewAllBtn}
            onClick={() => onNavigateTab('about')}
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <div className={`${styles.activityIconBox} ${styles.activityBlue}`}>
              <Code2 size={15} />
            </div>
            <span className={styles.activityText}>Opened Development workspace</span>
            <span className={styles.activityTime}>2m ago</span>
          </div>

          <div className={styles.activityItem}>
            <div className={`${styles.activityIconBox} ${styles.activityPurple}`}>
              <FileText size={15} />
            </div>
            <span className={styles.activityText}>Added note: "API integration ideas"</span>
            <span className={styles.activityTime}>12m ago</span>
          </div>

          <div className={styles.activityItem}>
            <div className={`${styles.activityIconBox} ${styles.activityGreen}`}>
              <FolderOpen size={15} />
            </div>
            <span className={styles.activityText}>Launched: C:\Users\Projects</span>
            <span className={styles.activityTime}>1h ago</span>
          </div>
        </div>
      </section>
    </div>
  );
};
