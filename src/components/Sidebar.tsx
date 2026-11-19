import React from 'react';
import {
  Home,
  LayoutGrid,
  FileText,
  Settings,
  Info,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import styles from './Sidebar.module.css';

export type NavTab = 'overview' | 'workspaces' | 'notes' | 'activity' | 'settings' | 'about';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  workspaceCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  workspaceCount = 0,
}) => {
  return (
    <aside className={styles.sidebar}>
      {/* Brand header */}
      <div className={styles.brand}>
        <img src="/icon.png" alt="DeskPilot" className={styles.brandImg} />
        <span className={styles.brandTitle}>DeskPilot</span>
      </div>

      {/* Primary Navigation matching Windows 11 Fluent design mockup */}
      <nav className={styles.nav} aria-label="Main navigation">
        <button
          className={clsx(styles.navItem, currentTab === 'overview' && styles.navItemActive)}
          onClick={() => onSelectTab('overview')}
        >
          <Home size={16} strokeWidth={1.8} />
          <span>Home</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'workspaces' && styles.navItemActive)}
          onClick={() => onSelectTab('workspaces')}
        >
          <LayoutGrid size={16} strokeWidth={1.8} />
          <span>Workspaces</span>
          {workspaceCount > 0 && (
            <span className={styles.countBadge}>{workspaceCount}</span>
          )}
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'notes' && styles.navItemActive)}
          onClick={() => onSelectTab('notes')}
        >
          <FileText size={16} strokeWidth={1.8} />
          <span>Quick Notes</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'settings' && styles.navItemActive)}
          onClick={() => onSelectTab('settings')}
        >
          <Settings size={16} strokeWidth={1.8} />
          <span>Settings</span>
        </button>

        <button
          className={clsx(styles.navItem, currentTab === 'about' && styles.navItemActive)}
          onClick={() => onSelectTab('about')}
        >
          <Info size={16} strokeWidth={1.8} />
          <span>About</span>
        </button>
      </nav>

      {/* Bottom Status Card (Exact match to Design Mockup) */}
      <div className={styles.footer}>
        <div className={styles.statusCard}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot} />
            <span className={styles.statusTitle}>All Set!</span>
          </div>
          <p className={styles.statusText}>Ready to launch your workspace</p>
        </div>

        <div className={styles.storageInfo} title="All workspace data stays strictly on this machine">
          <ShieldCheck size={12} strokeWidth={2} className={styles.shieldIcon} />
          <span>Stored on this PC</span>
        </div>
      </div>
    </aside>
  );
};
