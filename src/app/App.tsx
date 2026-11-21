import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkspaceDTO, CreateWorkspaceInput, UpdateWorkspaceInput } from '../lib/types';
import { desktopApi, onQuickSwitcherShow, onDashboardShow, onCaptureDesktopEvent } from '../lib/desktop-api';
import { listen } from '@tauri-apps/api/event';
import { Sidebar, type NavTab } from '../components/Sidebar';
import { OverviewView } from '../features/overview/OverviewView';
import { WorkspacesView } from '../features/workspaces/WorkspacesView';
import { WorkspaceDetailView } from '../features/workspaces/WorkspaceDetailView';
import { ActivityView } from '../features/activity/ActivityView';
import { SettingsView } from '../features/settings/SettingsView';
import { QuickNotesView } from '../features/notes/QuickNotesView';
import { AboutView } from '../features/about/AboutView';
import { WindowHeader } from '../components/WindowHeader';
import { WorkspaceModal } from '../components/WorkspaceModal';
import { DeleteModal } from '../components/DeleteModal';
import { LaunchModal } from '../components/LaunchModal';
import { QuickSwitcher } from '../components/QuickSwitcher';
import { useToast } from '../components/Toast';
import styles from './App.module.css';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<WorkspaceDTO | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceDTO | null>(null);

  // Quick Switcher state
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);

  // Live Launch state
  const [activeLaunchRun, setActiveLaunchRun] = useState<{ runId: string; workspaceName: string } | null>(null);

  // Theme state: Default to system per Section 6.4
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const { showToast } = useToast();
  const isCapturingRef = useRef(false);

  // Load workspaces from Rust SQLite
  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await desktopApi.workspaces.list();
      setWorkspaces(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load workspaces', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Workspace 1-Click Desktop Capture Handler with lock
  const handleCaptureCurrent = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const created = await desktopApi.workspaces.captureCurrent();
      showToast(`Captured workspace "${created.name}" with ${created.items.length} apps`, 'success');
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to capture desktop workspace', 'error');
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
      }, 1000);
    }
  }, [loadWorkspaces, showToast]);

  const handleCaptureRef = useRef(handleCaptureCurrent);
  handleCaptureRef.current = handleCaptureCurrent;

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Fetch and apply Windows active theme color dynamically
  useEffect(() => {
    desktopApi.settings.getWindowsThemeColor().then((color) => {
      const root = document.documentElement;
      root.style.setProperty('--win-accent', color.hex);
      root.style.setProperty('--win-accent-rgb', `${color.r}, ${color.g}, ${color.b}`);
      root.style.setProperty('--win-accent-glow', color.accentGlow);
      root.style.setProperty('--win-accent-subtle', color.accentSubtle);
      root.style.setProperty('--win-accent-highlight', color.liquidHighlight);
      root.style.setProperty('--win-accent-border', `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
    }).catch((err) => {
      console.warn('Could not query Windows theme color:', err);
    });
  }, []);

  // Global shortcut and Tray Event Listeners
  useEffect(() => {
    let unlistenShortcut: (() => void) | null = null;
    let unlistenDashboard: (() => void) | null = null;
    let unlistenCapture: (() => void) | null = null;
    let unlistenLaunchLast: (() => void) | null = null;
    let unlistenNavigate: (() => void) | null = null;

    listen<NavTab>('app:navigate-tab', (event) => {
      if (event.payload) {
        setSelectedWorkspaceId(null);
        setCurrentTab(event.payload);
      }
    }).then((fn) => {
      unlistenNavigate = fn;
    });

    onQuickSwitcherShow(() => {
      setIsQuickSwitcherOpen(true);
    }).then((fn) => {
      unlistenShortcut = fn;
    });

    onDashboardShow(() => {
      setIsQuickSwitcherOpen(false);
    }).then((fn) => {
      unlistenDashboard = fn;
    });

    onCaptureDesktopEvent(() => {
      handleCaptureRef.current();
    }).then((fn) => {
      unlistenCapture = fn;
    });

    listen('workspace:launch-last', async () => {
      try {
        const list = await desktopApi.workspaces.list();
        if (list && list.length > 0) {
          const sorted = [...list].sort((a, b) => {
            if (!a.lastLaunchedAt && !b.lastLaunchedAt) return 0;
            if (!a.lastLaunchedAt) return 1;
            if (!b.lastLaunchedAt) return -1;
            return new Date(b.lastLaunchedAt).getTime() - new Date(a.lastLaunchedAt).getTime();
          });
          if (sorted[0]) {
            await desktopApi.launch.start(sorted[0].id);
            showToast(`Launched "${sorted[0].name}"`, 'success');
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to launch last workspace', 'error');
      }
    }).then((fn) => {
      unlistenLaunchLast = fn;
    });

    return () => {
      if (unlistenShortcut) unlistenShortcut();
      if (unlistenDashboard) unlistenDashboard();
      if (unlistenCapture) unlistenCapture();
      if (unlistenLaunchLast) unlistenLaunchLast();
      if (unlistenNavigate) unlistenNavigate();
    };
  }, [showToast]);

  // Launch the most recently launched workspace (Ctrl + Shift + L)
  const handleLaunchLast = useCallback(async () => {
    if (workspaces.length === 0) {
      showToast('No workspaces available to launch', 'info');
      return;
    }
    // Sort by lastLaunchedAt descending
    const sorted = [...workspaces].sort((a, b) => {
      if (!a.lastLaunchedAt && !b.lastLaunchedAt) return 0;
      if (!a.lastLaunchedAt) return 1;
      if (!b.lastLaunchedAt) return -1;
      return new Date(b.lastLaunchedAt).getTime() - new Date(a.lastLaunchedAt).getTime();
    });

    const target = sorted[0];
    if (target) {
      await handleLaunch(target.id);
    }
  }, [workspaces]);

  // In-app keyboard shortcuts: Ctrl+Space / Ctrl+K (Quick Switcher), Ctrl+Shift+C (Capture), Ctrl+Shift+L (Launch Last), Ctrl+N (New), Ctrl+, (Settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        setIsQuickSwitcherOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSwitcherOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c' && !isInput) {
        e.preventDefault();
        handleCaptureCurrent();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l' && !isInput) {
        e.preventDefault();
        handleLaunchLast();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !isInput) {
        e.preventDefault();
        handleOpenCreate();
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',' && !isInput) {
        e.preventDefault();
        handleSelectTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLaunchLast]);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');

      const listener = (e: MediaQueryListEvent) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Tab switching clears detail view
  const handleSelectTab = (tab: NavTab) => {
    setSelectedWorkspaceId(null);
    setCurrentTab(tab);
  };

  // Workspace CRUD handlers
  const handleOpenCreate = () => {
    setWorkspaceToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ws: WorkspaceDTO) => {
    setWorkspaceToEdit(ws);
    setIsModalOpen(true);
  };

  const handleSaveWorkspace = async (data: CreateWorkspaceInput | UpdateWorkspaceInput) => {
    if (workspaceToEdit) {
      await desktopApi.workspaces.update(workspaceToEdit.id, data);
      showToast('Workspace updated successfully', 'success');
    } else {
      const created = await desktopApi.workspaces.create(data as CreateWorkspaceInput);
      showToast('Workspace created successfully', 'success');
      setSelectedWorkspaceId(created.id);
    }
    await loadWorkspaces();
  };

  const handleDuplicate = async (id: string) => {
    try {
      await desktopApi.workspaces.duplicate(id);
      showToast('Workspace duplicated', 'success');
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to duplicate workspace', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await desktopApi.workspaces.delete(id);
      showToast('Workspace deleted', 'info');
      if (selectedWorkspaceId === id) {
        setSelectedWorkspaceId(null);
      }
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete workspace', 'error');
    }
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await desktopApi.workspaces.update(id, { isFavorite: !current });
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to update favorite', 'error');
    }
  };

  const handleLaunch = async (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;

    try {
      const { runId } = await desktopApi.launch.start(id);
      setActiveLaunchRun({ runId, workspaceName: ws.name });
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to launch workspace', 'error');
    }
  };

  const handleCloseQuickSwitcher = () => {
    setIsQuickSwitcherOpen(false);
    desktopApi.window.hide().catch(() => {});
  };

  const handleQuickLaunch = async (id: string) => {
    await handleLaunch(id);
    setTimeout(() => {
      desktopApi.window.hide().catch(() => {});
    }, 800);
  };

  return (
    <div className={styles.appShell}>
      <WindowHeader title="DeskPilot Settings & Workspaces" showBrand={true} />
      <div className={styles.appLayout}>
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          workspaceCount={workspaces.length}
        />

        <main className={styles.mainContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <span>Loading workspaces...</span>
          </div>
        ) : selectedWorkspaceId ? (
          <WorkspaceDetailView
            workspaceId={selectedWorkspaceId}
            onBack={() => setSelectedWorkspaceId(null)}
            onLaunch={handleLaunch}
            onEditWorkspace={handleOpenEdit}
            onDeleteWorkspace={setWorkspaceToDelete}
          />
        ) : (
          <>
            {currentTab === 'overview' && (
              <OverviewView
                workspaces={workspaces}
                onOpenCreate={handleOpenCreate}
                onLaunch={handleLaunch}
                onLaunchLast={handleLaunchLast}
                onEdit={handleOpenEdit}
                onDuplicate={handleDuplicate}
                onDelete={setWorkspaceToDelete}
                onToggleFavorite={handleToggleFavorite}
                onOpenDetail={(id) => setSelectedWorkspaceId(id)}
                onCaptureCurrent={handleCaptureCurrent}
                onNavigateTab={handleSelectTab}
              />
            )}

            {currentTab === 'workspaces' && (
              <WorkspacesView
                workspaces={workspaces}
                onOpenCreate={handleOpenCreate}
                onLaunch={handleLaunch}
                onEdit={handleOpenEdit}
                onDuplicate={handleDuplicate}
                onDelete={setWorkspaceToDelete}
                onToggleFavorite={handleToggleFavorite}
                onOpenDetail={(id) => setSelectedWorkspaceId(id)}
              />
            )}

            {currentTab === 'notes' && (
              <QuickNotesView workspaces={workspaces} />
            )}

            {currentTab === 'activity' && (
              <ActivityView />
            )}

            {currentTab === 'settings' && (
              <SettingsView currentTheme={theme} onThemeChange={setTheme} />
            )}

            {currentTab === 'about' && (
              <AboutView />
            )}
          </>
        )}
      </main>

      {/* Create / Edit Modal */}
      <WorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveWorkspace}
        workspaceToEdit={workspaceToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={Boolean(workspaceToDelete)}
        workspace={workspaceToDelete}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={handleDelete}
      />

      {/* Launch Progress Modal */}
      {activeLaunchRun && (
        <LaunchModal
          runId={activeLaunchRun.runId}
          workspaceName={activeLaunchRun.workspaceName}
          onClose={() => setActiveLaunchRun(null)}
        />
      )}

      {/* Quick Switcher Floating Overlay (Section 6.6) */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={handleCloseQuickSwitcher}
        workspaces={workspaces}
        onLaunch={handleQuickLaunch}
        onOpenDashboard={() => {
          setIsQuickSwitcherOpen(false);
        }}
        onOpenNotes={() => {
          setSelectedWorkspaceId(null);
          setCurrentTab('workspaces');
          setIsQuickSwitcherOpen(false);
        }}
        onOpenSettings={() => {
          setSelectedWorkspaceId(null);
          setCurrentTab('settings');
          setIsQuickSwitcherOpen(false);
        }}
        onCaptureCurrent={handleCaptureCurrent}
      />
      </div>
    </div>
  );
};
