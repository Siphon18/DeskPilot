import React from 'react';
import { Home, LayoutGrid, FileText, Settings, Info, Navigation } from 'lucide-react';
import clsx from 'clsx';
import styles from './Sidebar.module.css';

export type NavTab = 'overview' | 'workspaces' | 'notes' | 'settings' | 'about';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandIconWrapper}>
          <Navigation size={18} className={styles.brandIcon} />
        </div>
        <span className={styles.brandTitle}>DeskPilot</span>
      </div>

      <nav className={styles.nav}>
        <button
          className={clsx(styles.navItem, currentTab === 'overview' && styles.navItemActive)}
          onClick={() => onSelectTab('overview')}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'workspaces' && styles.navItemActive)}
          onClick={() => onSelectTab('workspaces')}
        >
          <LayoutGrid size={18} />
          <span>Workspaces</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'notes' && styles.navItemActive)}
          onClick={() => onSelectTab('notes')}
        >
          <FileText size={18} />
          <span>Quick Notes</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'settings' && styles.navItemActive)}
          onClick={() => onSelectTab('settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'about' && styles.navItemActive)}
          onClick={() => onSelectTab('about')}
        >
          <Info size={18} />
          <span>About</span>
        </button>
      </nav>

      <div className={styles.footer}>
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <span className={styles.statusDot} />
            <span className={styles.statusTitle}>All Set!</span>
          </div>
          <p className={styles.statusSubtitle}>Ready to launch your workspace</p>
        </div>
      </div>
    </aside>
  );
};
