import React from 'react';
import { Layers, LayoutGrid, History, Settings, ShieldCheck, Compass } from 'lucide-react';
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
      {/* Brand header */}
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <Compass size={17} strokeWidth={2} />
        </div>
        <span className={styles.brandTitle}>DeskPilot</span>
      </div>

      {/* Primary Navigation */}
      <nav className={styles.nav} aria-label="Main navigation">
        <button
          className={clsx(styles.navItem, currentTab === 'overview' && styles.navItemActive)}
          onClick={() => onSelectTab('overview')}
        >
          <Layers size={17} strokeWidth={1.8} />
          <span>Overview</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'workspaces' && styles.navItemActive)}
          onClick={() => onSelectTab('workspaces')}
        >
          <LayoutGrid size={17} strokeWidth={1.8} />
          <span>Workspaces</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'activity' && styles.navItemActive)}
          onClick={() => onSelectTab('activity')}
        >
          <History size={17} strokeWidth={1.8} />
          <span>Activity</span>
        </button>
      </nav>

      {/* Bottom Anchored Section: Settings & Local Status */}
      <div className={styles.footer}>
        <button
          className={clsx(styles.navItem, currentTab === 'settings' && styles.navItemActive)}
          onClick={() => onSelectTab('settings')}
        >
          <Settings size={17} strokeWidth={1.8} />
          <span>Settings</span>
        </button>

        <div className={styles.statusLine} title="All workspace data stays strictly on this machine">
          <ShieldCheck size={13} className={styles.statusIcon} strokeWidth={2} />
          <span>Stored on this PC</span>
        </div>
      </div>
    </aside>
  );
};
