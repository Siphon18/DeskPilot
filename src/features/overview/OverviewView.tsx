import React from 'react';
import { Plus, Star, Sparkles, Layers } from 'lucide-react';
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
}) => {
  const favorites = workspaces.filter((w) => w.isFavorite);
  const hasWorkspaces = workspaces.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headingArea}>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Restore your active work context in one click</p>
        </div>

        <button className={styles.primaryBtn} onClick={onOpenCreate}>
          <Plus size={16} />
          <span>New Workspace</span>
        </button>
      </div>

      {!hasWorkspaces ? (
        <div className={styles.onboardingCard}>
          <div className={styles.onboardingIcon}>
            <Sparkles size={28} />
          </div>
          <h2 className={styles.onboardingTitle}>Your work, ready when you are</h2>
          <p className={styles.onboardingText}>
            DeskPilot organizes your everyday apps, project directories, browser tabs, and terminals into fast, one-click workspaces.
          </p>
          <button className={styles.primaryBtn} onClick={onOpenCreate} style={{ marginTop: '8px' }}>
            <Plus size={16} />
            <span>Create your first workspace</span>
          </button>
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Star size={16} fill="#ffaa00" color="#ffaa00" />
                  <span>Favorites</span>
                  <span className={styles.badge}>{favorites.length}</span>
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

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Layers size={16} />
                <span>All Workspaces</span>
                <span className={styles.badge}>{workspaces.length}</span>
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

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Activity</h2>
            </div>
            <div className={styles.activityBox}>
              <span>Launch history will be recorded here when you start workspaces.</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
