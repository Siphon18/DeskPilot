export type LaunchItemType = 'application' | 'folder' | 'url' | 'terminal';

export interface ApplicationConfig {
  type: 'application';
  executablePath: string;
  args: string[];
  workingDirectory?: string;
}

export interface FolderConfig {
  type: 'folder';
  path: string;
}

export interface UrlConfig {
  type: 'url';
  url: string;
}

export interface TerminalConfig {
  type: 'terminal';
  workingDirectory: string;
  terminal: 'windowsTerminal' | 'powershell';
  allowFallback: boolean;
}

export type LaunchItemConfig =
  | ApplicationConfig
  | FolderConfig
  | UrlConfig
  | TerminalConfig;

export interface LaunchItemDTO {
  id: string;
  workspaceId: string;
  type: LaunchItemType;
  name: string;
  config: LaunchItemConfig;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  isMissing?: boolean;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isFavorite: boolean;
  sortOrder: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  lastLaunchedAt: string | null;
}

export interface WorkspaceTaskDTO {
  id: string;
  workspaceId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDetailDTO extends WorkspaceDTO {
  items: LaunchItemDTO[];
  note: string;
  tasks: WorkspaceTaskDTO[];
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isFavorite?: boolean;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isFavorite?: boolean;
  sortOrder?: number;
}

export interface WorkspaceQuery {
  search?: string;
  favoritesOnly?: boolean;
  sortBy?: 'custom' | 'recently_launched' | 'name';
}

export type LaunchItemStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'warning'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface LaunchItemResult {
  itemId: string;
  itemName: string;
  itemType: LaunchItemType;
  status: LaunchItemStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  message: string;
  errorCode?: string;
}

export type LaunchRunStatus =
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed';

export interface LaunchRunDTO {
  id: string;
  workspaceId: string | null;
  workspaceNameSnapshot: string;
  status: LaunchRunStatus;
  startedAt: string;
  completedAt: string | null;
  totalCount: number;
  successCount: number;
  warningCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface LaunchRunDetailDTO extends LaunchRunDTO {
  items: LaunchItemResult[];
}

export interface LaunchProgressEvent {
  runId: string;
  workspaceId: string;
  totalCount: number;
  completedCount: number;
  currentItem?: {
    itemId: string;
    name: string;
    type: LaunchItemType;
    status: LaunchItemStatus;
  };
  overallStatus: LaunchRunStatus;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  globalShortcut: string;
  keepRunningInTray: boolean;
  urlDelayMs: number;
  showLaunchToast: boolean;
  dataDirectory: string;
}
