import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  WorkspaceDTO,
  WorkspaceDetailDTO,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceQuery,
  LaunchItemDTO,
  LaunchRunDetailDTO,
  LaunchRunDTO,
  LaunchProgressEvent,
  AppSettings,
} from './types';

export const desktopApi = {
  workspaces: {
    list: (query?: WorkspaceQuery): Promise<WorkspaceDTO[]> =>
      invoke<WorkspaceDTO[]>('workspace_list', { query }),
    get: (id: string): Promise<WorkspaceDetailDTO | null> =>
      invoke<WorkspaceDetailDTO | null>('workspace_get', { id }),
    create: (input: CreateWorkspaceInput): Promise<WorkspaceDetailDTO> =>
      invoke<WorkspaceDetailDTO>('workspace_create', { input }),
    update: (id: string, input: UpdateWorkspaceInput): Promise<WorkspaceDetailDTO> =>
      invoke<WorkspaceDetailDTO>('workspace_update', { id, input }),
    delete: (id: string): Promise<void> =>
      invoke<void>('workspace_delete', { id }),
    duplicate: (id: string): Promise<WorkspaceDetailDTO> =>
      invoke<WorkspaceDetailDTO>('workspace_duplicate', { id }),
  },
  items: {
    create: (workspaceId: string, input: any): Promise<LaunchItemDTO> =>
      invoke<LaunchItemDTO>('item_create', { workspaceId, input }),
    update: (id: string, input: any): Promise<LaunchItemDTO> =>
      invoke<LaunchItemDTO>('item_update', { id, input }),
    delete: (id: string): Promise<void> =>
      invoke<void>('item_delete', { id }),
    reorder: (workspaceId: string, itemIds: string[]): Promise<void> =>
      invoke<void>('item_reorder', { workspaceId, itemIds }),
    pickExecutable: (): Promise<string | null> =>
      invoke<string | null>('pick_executable'),
    pickFolder: (): Promise<string | null> =>
      invoke<string | null>('pick_folder'),
  },
  notes: {
    save: (workspaceId: string, content: string): Promise<void> =>
      invoke<void>('note_save', { workspaceId, content }),
  },
  tasks: {
    create: (workspaceId: string, title: string): Promise<void> =>
      invoke<void>('task_create', { workspaceId, title }),
    toggle: (taskId: string, isCompleted: boolean): Promise<void> =>
      invoke<void>('task_toggle', { taskId, isCompleted }),
    delete: (taskId: string): Promise<void> =>
      invoke<void>('task_delete', { taskId }),
    reorder: (workspaceId: string, taskIds: string[]): Promise<void> =>
      invoke<void>('task_reorder', { workspaceId, taskIds }),
  },
  launch: {
    start: (workspaceId: string): Promise<{ runId: string }> =>
      invoke<{ runId: string }>('launch_workspace', { workspaceId }),
    getRun: (runId: string): Promise<LaunchRunDetailDTO | null> =>
      invoke<LaunchRunDetailDTO | null>('launch_get_run', { runId }),
    listRuns: (limit?: number): Promise<LaunchRunDTO[]> =>
      invoke<LaunchRunDTO[]>('launch_list_runs', { limit }),
  },
  settings: {
    get: (): Promise<AppSettings> =>
      invoke<AppSettings>('settings_get'),
    update: (settings: Partial<AppSettings>): Promise<AppSettings> =>
      invoke<AppSettings>('settings_update', { settings }),
    openDataFolder: (): Promise<void> =>
      invoke<void>('settings_open_data_folder'),
  },
};

export async function onLaunchProgress(
  handler: (event: LaunchProgressEvent) => void
): Promise<UnlistenFn> {
  return listen<LaunchProgressEvent>('launch-progress', (event) =>
    handler(event.payload)
  );
}

export async function onQuickSwitcherShow(
  handler: () => void
): Promise<UnlistenFn> {
  return listen('quick-switcher:show', () => handler());
}
