import React, { useState, useEffect, useCallback } from 'react';
import type { WorkspaceDTO, CreateWorkspaceInput, UpdateWorkspaceInput } from '../lib/types';
import { desktopApi, onQuickSwitcherShow } from '../lib/desktop-api';
import { Sidebar, type NavTab } from '../components/Sidebar';
import { OverviewView } from '../features/overview/OverviewView';
import { WorkspacesView } from '../features/workspaces/WorkspacesView';
import { WorkspaceDetailView } from '../features/workspaces/WorkspaceDetailView';
import { QuickNotesView } from '../features/notes/QuickNotesView';
import { SettingsView } from '../features/settings/SettingsView';
import { AboutView } from '../features/about/AboutView';
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

  // Theme state
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('dark');
  const { showToast } = useToast();

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
      root.style.setProperty('--win-accent-border', `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`);
    }).catch((err) => {
      console.warn('Could not query Windows theme color:', err);
    });
  }, []);

  // Global shortcut listener from Rust (Ctrl+Space / Ctrl+Alt+Space)
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    onQuickSwitcherShow(() => {
      setIsQuickSwitcherOpen(true);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Workspace 1-Click Desktop Capture Handler
  const handleCaptureCurrent = async () => {
    try {
      const created = await desktopApi.workspaces.captureCurrent();
      showToast(`Captured workspace "${created.name}" with ${created.items.length} apps!`, 'success');
      await loadWorkspaces();
    } catch (err: any) {
      showToast(err.message || 'Failed to capture desktop workspace', 'error');
    }
  };

  // In-app keyboard shortcuts: Ctrl+Space / Ctrl+K (Quick Switcher), Ctrl+Shift+C (Capture)
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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !isInput) {
        e.preventDefault();
        handleOpenCreate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <div className={styles.appLayout}>
      {/* Liquid Ambient Mesh Backdrop blending with Windows Active Theme */}
      <div className={styles.liquidMeshContainer} aria-hidden="true">
        <div className={styles.liquidOrb1} />
        <div className={styles.liquidOrb2} />
        <div className={styles.liquidOrb3} />
      </div>

      <Sidebar currentTab={currentTab} onSelectTab={handleSelectTab} />

      <main className={styles.mainContent}>
        {/* Custom Window Titlebar row */}
        <div className={styles.windowTitleBar}>
          <div className={styles.titleBarLeft}>
            <button
              className={styles.quickLauncherTriggerBtn}
              onClick={() => setIsQuickSwitcherOpen(true)}
              title="Open Quick Launcher (Ctrl + Space)"
            >
              <span>Quick Launcher</span>
              <span className={styles.quickLauncherKbd}>Ctrl + Space</span>
            </button>
          </div>
          <div className={styles.windowControls}>
            <span className={styles.controlBtn} title="Minimize">&#x2014;</span>
            <span className={styles.controlBtn} title="Maximize">&#x25A1;</span>
            <span className={`${styles.controlBtn} ${styles.controlClose}`} title="Close">&#x2715;</span>
          </div>
        </div>

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

      {/* Quick Switcher / Quick Launcher Overlay */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        workspaces={workspaces}
        onLaunch={handleLaunch}
        onOpenNotes={() => handleSelectTab('notes')}
        onOpenSettings={() => handleSelectTab('settings')}
        onCaptureCurrent={handleCaptureCurrent}
      />
    </div>
  );
};
