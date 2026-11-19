import React from 'react';
import { LayoutDashboard, Layers, History, Settings, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import styles from './Sidebar.module.css';

export type NavTab = 'overview' | 'workspaces' | 'activity' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandIcon}>D</div>
        <span className={styles.brandTitle}>DeskPilot</span>
      </div>

      <nav className={styles.nav}>
        <button
          className={clsx(styles.navItem, currentTab === 'overview' && styles.navItemActive)}
          onClick={() => onSelectTab('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'workspaces' && styles.navItemActive)}
          onClick={() => onSelectTab('workspaces')}
        >
          <Layers size={18} />
          <span>Workspaces</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'activity' && styles.navItemActive)}
          onClick={() => onSelectTab('activity')}
        >
          <History size={18} />
          <span>Activity</span>
        </button>
      </nav>

      <div className={styles.footer}>
        <button
          className={clsx(styles.navItem, currentTab === 'settings' && styles.navItemActive)}
          onClick={() => onSelectTab('settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <div className={styles.localBadge} title="Your workspace data stays on this PC">
          <ShieldCheck size={14} className={styles.localDotIcon} />
          <span>Local-first storage</span>
        </div>
      </div>
    </aside>
  );
};
