import React, { useState, useMemo } from 'react';
import { Plus, Search, Star, Inbox } from 'lucide-react';
import type { WorkspaceDTO } from '../../lib/types';
import { WorkspaceCard } from '../../components/WorkspaceCard';
import styles from './WorkspacesView.module.css';

interface WorkspacesViewProps {
  workspaces: WorkspaceDTO[];
  onOpenCreate: () => void;
  onLaunch: (id: string) => void;
  onEdit: (workspace: WorkspaceDTO) => void;
  onDuplicate: (id: string) => void;
  onDelete: (workspace: WorkspaceDTO) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onOpenDetail: (id: string) => void;
}

export const WorkspacesView: React.FC<WorkspacesViewProps> = ({
  workspaces,
  onOpenCreate,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onOpenDetail,
}) => {
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'custom' | 'recently_launched' | 'name'>('custom');

  const filteredWorkspaces = useMemo(() => {
    let list = [...workspaces];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
      );
    }

    if (favoritesOnly) {
      list = list.filter((w) => w.isFavorite);
    }

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'recently_launched') {
      list.sort((a, b) => {
        if (!a.lastLaunchedAt && !b.lastLaunchedAt) return 0;
        if (!a.lastLaunchedAt) return 1;
        if (!b.lastLaunchedAt) return -1;
        return new Date(b.lastLaunchedAt).getTime() - new Date(a.lastLaunchedAt).getTime();
      });
    } else {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return list;
  }, [workspaces, search, favoritesOnly, sortBy]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headingArea}>
          <h1 className={styles.title}>All Workspaces</h1>
          <p className={styles.subtitle}>Browse and manage all configured workspaces</p>
        </div>

        <button className={styles.primaryBtn} onClick={onOpenCreate}>
          <Plus size={16} />
          <span>New Workspace</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <button
            className={`${styles.favFilterBtn} ${favoritesOnly ? styles.favFilterActive : ''}`}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            <Star size={14} fill={favoritesOnly ? 'currentColor' : 'none'} />
            <span>Favorites</span>
          </button>

          <select
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="custom">Sort: Default order</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="recently_launched">Sort: Recently launched</option>
          </select>
        </div>
      </div>

      {filteredWorkspaces.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={32} color="var(--text-tertiary)" />
          <h3 className={styles.emptyTitle}>No workspaces found</h3>
          <p className={styles.emptyText}>
            {search || favoritesOnly
              ? 'Try adjusting your search query or filter.'
              : 'Create your first workspace to get started.'}
          </p>
          {!search && !favoritesOnly && (
            <button className={styles.primaryBtn} onClick={onOpenCreate} style={{ marginTop: '8px' }}>
              <Plus size={16} />
              <span>Create Workspace</span>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredWorkspaces.map((w) => (
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
    </div>
  );
};
