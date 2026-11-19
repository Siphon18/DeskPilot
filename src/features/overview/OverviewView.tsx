import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Camera,
  Layers,
  Clock,
  Zap,
  Settings,
  ArrowRight,
  FileText,
} from 'lucide-react';
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
  onNavigateTab: (tab: 'overview' | 'workspaces' | 'notes' | 'settings' | 'about') => void;
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

  // Dynamic context greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 18) return 'Good afternoon!';
    return 'Good evening!';
  }, []);

  // Load actual launch runs from SQLite
  useEffect(() => {
    desktopApi.launch
      .listRuns(5)
      .then((runs) => {
        setRecentRuns(runs || []);
      })
      .catch(() => {
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
      {/* 1. Windows 11 Fluent Hero Banner (Exact match to Design Mockup) */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{greeting}</h1>
          <p className={styles.heroSubtitle}>What would you like to work on today?</p>
        </div>

        {/* Crisp vector illustration of Windows workstation & plant */}
        <div className={styles.heroGraphic} aria-hidden="true">
          <svg
            className={styles.heroSvg}
            viewBox="0 0 280 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft backdrop ambient light */}
            <circle cx="160" cy="70" r="60" fill="var(--win-accent)" fillOpacity="0.12" />

            {/* Laptop Base */}
            <rect x="90" y="112" width="130" height="7" rx="3.5" fill="#2d3748" />
            <path d="M142 112h26v2h-26z" fill="#4a5568" />

            {/* Laptop Screen Bezel */}
            <rect x="104" y="44" width="102" height="68" rx="4" fill="#1a202c" stroke="#4a5568" strokeWidth="1.5" />
            
            {/* Screen Glass */}
            <rect x="108" y="48" width="94" height="60" rx="2" fill="#0d1117" />

            {/* Windows Logo Glowing on Screen */}
            <g transform="translate(145, 68) scale(0.9)">
              <rect x="0" y="0" width="7" height="7" rx="0.5" fill="var(--win-accent)" fillOpacity="0.9" />
              <rect x="9" y="0" width="7" height="7" rx="0.5" fill="var(--win-accent)" fillOpacity="0.9" />
              <rect x="0" y="9" width="7" height="7" rx="0.5" fill="var(--win-accent)" fillOpacity="0.9" />
              <rect x="9" y="9" width="7" height="7" rx="0.5" fill="var(--win-accent)" fillOpacity="0.9" />
            </g>

            {/* Plant Pot */}
            <path d="M52 98l4 21h18l4-21H52z" fill="#e2e8f0" fillOpacity="0.85" />
            <ellipse cx="65" cy="98" rx="13" ry="2.5" fill="#cbd5e1" />

            {/* Succulent Leaves */}
            <path d="M65 98c-8-6-14-18-6-24 5 7 9 16 6 24z" fill="#10b981" fillOpacity="0.8" />
            <path d="M65 98c8-6 14-18 6-24-5 7-9 16-6 24z" fill="#059669" fillOpacity="0.9" />
            <path d="M65 98c0-10-2-26 5-28 2 10-1 20-5 28z" fill="#34d399" />
          </svg>
        </div>
      </div>

      {/* 2. Your Workspaces Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Your Workspaces</h2>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryBtn}
              onClick={onCaptureCurrent}
              title="Snapshot open applications into a workspace in one click (Ctrl + Shift + C)"
            >
              <Camera size={14} strokeWidth={1.8} />
              <span>Capture desktop</span>
            </button>

            <button className={styles.primaryBtn} onClick={onOpenCreate}>
              <Plus size={15} strokeWidth={2} />
              <span>New Workspace</span>
            </button>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconBox}>
              <Layers size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.emptyTitle}>No workspaces yet</h3>
            <p className={styles.emptyText}>
              Create your first workspace to organize your apps, browser tabs, and folders into a 1-click launch group.
            </p>
            <div className={styles.emptyActions}>
              <button className={styles.primaryBtn} onClick={onOpenCreate}>
                <Plus size={15} />
                <span>New Workspace</span>
              </button>
              <button className={styles.secondaryBtn} onClick={onCaptureCurrent}>
                <Camera size={14} />
                <span>Capture desktop</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.workspaceGrid}>
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

      {/* 3. Quick Actions Row (Mockup Reference: Launch Last, Add Note, Open Folder, Settings) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
        </div>

        <div className={styles.quickActionsGrid}>
          <button
            className={styles.quickActionCard}
            onClick={onLaunchLast}
            title="Launch the most recently used workspace (Ctrl + Shift + L)"
          >
            <div className={`${styles.quickActionIcon} ${styles.iconZap}`}>
              <Zap size={16} strokeWidth={2} />
            </div>
            <div className={styles.quickActionText}>
              <span className={styles.quickActionTitle}>Launch Last Workspace</span>
              <span className={styles.quickActionShortcut}>Ctrl + Shift + L</span>
            </div>
          </button>

          <button
            className={styles.quickActionCard}
            onClick={() => onNavigateTab('notes')}
            title="Open workspace scratchpad notes (Ctrl + N)"
          >
            <div className={`${styles.quickActionIcon} ${styles.iconNotes}`}>
              <FileText size={16} strokeWidth={2} />
            </div>
            <div className={styles.quickActionText}>
              <span className={styles.quickActionTitle}>Add Note</span>
              <span className={styles.quickActionShortcut}>Ctrl + N</span>
            </div>
          </button>

          <button
            className={styles.quickActionCard}
            onClick={onCaptureCurrent}
            title="Snapshot currently active windows into a new workspace (Ctrl + Shift + C)"
          >
            <div className={`${styles.quickActionIcon} ${styles.iconCapture}`}>
              <Camera size={16} strokeWidth={2} />
            </div>
            <div className={styles.quickActionText}>
              <span className={styles.quickActionTitle}>Capture Desktop</span>
              <span className={styles.quickActionShortcut}>Ctrl + Shift + C</span>
            </div>
          </button>

          <button
            className={styles.quickActionCard}
            onClick={() => onNavigateTab('settings')}
            title="Configure DeskPilot preferences (Ctrl + ,)"
          >
            <div className={`${styles.quickActionIcon} ${styles.iconSettings}`}>
              <Settings size={16} strokeWidth={2} />
            </div>
            <div className={styles.quickActionText}>
              <span className={styles.quickActionTitle}>Settings</span>
              <span className={styles.quickActionShortcut}>Ctrl + ,</span>
            </div>
          </button>
        </div>
      </section>

      {/* 4. Recent Activity */}
      {recentRuns.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <button
              className={styles.viewHistoryLink}
              onClick={() => onNavigateTab('about')}
            >
              <span>View All</span>
              <ArrowRight size={13} strokeWidth={2} />
            </button>
          </div>

          <div className={styles.recentList}>
            {recentRuns.map((run) => (
              <div key={run.id} className={styles.recentRow}>
                <div className={styles.recentInfo}>
                  <div className={styles.recentGlyph}>
                    <Layers size={14} strokeWidth={1.8} />
                  </div>
                  <div className={styles.recentDetails}>
                    <span className={styles.recentWorkspaceName}>
                      Launched {run.workspaceNameSnapshot}
                    </span>
                    <span className={styles.recentCounts}>
                      {run.successCount} of {run.totalCount} items opened
                    </span>
                  </div>
                </div>
                <div className={styles.recentMeta}>
                  <Clock size={12} strokeWidth={1.8} />
                  <span>{formatRunTime(run.startedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
