import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Edit3,
  Trash2,
  Layers,
  FileText,
  CheckSquare,
  Plus,
  AppWindow,
  Folder,
  Globe,
  Terminal,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Check,
  RotateCw,
} from 'lucide-react';
import type { WorkspaceDetailDTO, LaunchItemDTO, LaunchItemType } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import { IconRenderer, AVAILABLE_COLORS } from '../../components/IconRenderer';
import { ItemModal } from './ItemModal';
import { useToast } from '../../components/Toast';
import styles from './WorkspaceDetailView.module.css';

interface WorkspaceDetailViewProps {
  workspaceId: string;
  onBack: () => void;
  onLaunch: (id: string) => void;
  onEditWorkspace: (ws: any) => void;
  onDeleteWorkspace: (ws: any) => void;
}

export const WorkspaceDetailView: React.FC<WorkspaceDetailViewProps> = ({
  workspaceId,
  onBack,
  onLaunch,
  onEditWorkspace,
  onDeleteWorkspace,
}) => {
  const [workspace, setWorkspace] = useState<WorkspaceDetailDTO | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'notes' | 'checklist'>('items');
  const [isLoading, setIsLoading] = useState(true);

  // Item Modal state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<LaunchItemDTO | null>(null);
  const [itemInitialType, setItemInitialType] = useState<LaunchItemType>('application');

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [noteStatus, setNoteStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const noteDebounceTimer = useRef<number | null>(null);

  // Checklist state
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { showToast } = useToast();

  const loadWorkspace = useCallback(async () => {
    try {
      const data = await desktopApi.workspaces.get(workspaceId);
      if (data) {
        setWorkspace(data);
        setNoteContent(data.note || '');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load workspace detail', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, showToast]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Notes autosave handler
  const handleNoteChange = (text: string) => {
    setNoteContent(text);
    setNoteStatus('saving');

    if (noteDebounceTimer.current) {
      clearTimeout(noteDebounceTimer.current);
    }

    noteDebounceTimer.current = window.setTimeout(async () => {
      try {
        await desktopApi.notes.save(workspaceId, text);
        setNoteStatus('saved');
      } catch (err) {
        setNoteStatus('error');
      }
    }, 600);
  };

  const handleNoteBlur = async () => {
    if (noteDebounceTimer.current) {
      clearTimeout(noteDebounceTimer.current);
    }
    setNoteStatus('saving');
    try {
      await desktopApi.notes.save(workspaceId, noteContent);
      setNoteStatus('saved');
    } catch (err) {
      setNoteStatus('error');
    }
  };

  // Launch Item handlers
  const handleOpenAddItem = (type: LaunchItemType) => {
    setItemToEdit(null);
    setItemInitialType(type);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: LaunchItemDTO) => {
    setItemToEdit(item);
    setItemInitialType(item.type);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (data: any) => {
    if (itemToEdit) {
      await desktopApi.items.update(itemToEdit.id, data);
      showToast('Launch item updated', 'success');
    } else {
      await desktopApi.items.create(workspaceId, data);
      showToast('Launch item added', 'success');
    }
    await loadWorkspace();
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await desktopApi.items.delete(itemId);
      showToast('Launch item removed', 'info');
      await loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove item', 'error');
    }
  };

  const handleToggleItem = async (item: LaunchItemDTO) => {
    try {
      await desktopApi.items.update(item.id, { enabled: !item.enabled });
      await loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle item', 'error');
    }
  };

  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    if (!workspace) return;
    const items = [...workspace.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);

    const itemIds = items.map((it) => it.id);
    try {
      await desktopApi.items.reorder(workspaceId, itemIds);
      await loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder items', 'error');
    }
  };

  // Checklist handlers
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await desktopApi.tasks.create(workspaceId, newTaskTitle.trim());
      setNewTaskTitle('');
      await loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Failed to add task', 'error');
    }
  };

  const handleToggleTask = async (taskId: string, current: boolean) => {
    try {
      await desktopApi.tasks.toggle(taskId, !current);
      await loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle task', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await desktopApi.tasks.delete(taskId);
      await loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  if (isLoading || !workspace) {
    return <div>Loading workspace...</div>;
  }

  const colorMeta = AVAILABLE_COLORS.find((c) => c.id === workspace.color) || AVAILABLE_COLORS[0];
  const totalTasks = workspace.tasks.length;
  const completedTasks = workspace.tasks.filter((t) => t.isCompleted).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const renderItemSubtitle = (item: LaunchItemDTO) => {
    const cfg: any = item.config;
    if (item.type === 'application') {
      return cfg.executablePath || 'No executable path configured';
    }
    if (item.type === 'folder') {
      return cfg.path || 'No directory path configured';
    }
    if (item.type === 'url') {
      return cfg.url || 'No URL configured';
    }
    if (item.type === 'terminal') {
      return `${cfg.terminal === 'powershell' ? 'PowerShell' : 'Windows Terminal'}: ${cfg.workingDirectory}`;
    }
    return '';
  };

  const renderItemIcon = (type: LaunchItemType) => {
    switch (type) {
      case 'application':
        return <AppWindow size={16} />;
      case 'folder':
        return <Folder size={16} />;
      case 'url':
        return <Globe size={16} />;
      case 'terminal':
        return <Terminal size={16} />;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div>
        <button className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Workspaces</span>
        </button>

        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div
              className={styles.iconBox}
              style={{
                backgroundColor: `${colorMeta.hex}18`,
                color: colorMeta.hex,
              }}
            >
              <IconRenderer name={workspace.icon} size={26} color={colorMeta.hex} />
            </div>
            <div className={styles.titleText}>
              <h1 className={styles.title}>{workspace.name}</h1>
              <p className={styles.description}>
                {workspace.description || 'No description provided.'}
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.launchBtn}
              onClick={() => onLaunch(workspace.id)}
              title="Launch all enabled resources"
            >
              <Play size={16} fill="currentColor" />
              <span>Launch</span>
            </button>

            <button
              className={styles.actionBtn}
              onClick={() => onEditWorkspace(workspace)}
              title="Edit workspace properties"
            >
              <Edit3 size={15} />
              <span>Edit</span>
            </button>

            <button
              className={styles.actionBtn}
              onClick={() => onDeleteWorkspace(workspace)}
              title="Delete workspace"
            >
              <Trash2 size={15} color="var(--status-error)" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className={styles.tabsNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'items' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <Layers size={16} />
          <span>Launch Items</span>
          <span className={styles.tabCount}>{workspace.items.length}</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'notes' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <FileText size={16} />
          <span>Notes</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'checklist' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <CheckSquare size={16} />
          <span>Checklist</span>
          {totalTasks > 0 && (
            <span className={styles.tabCount}>{completedTasks}/{totalTasks}</span>
          )}
        </button>
      </nav>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* LAUNCH ITEMS TAB */}
        {activeTab === 'items' && (
          <>
            <div className={styles.itemsToolbar}>
              <span className={styles.itemsCountLabel}>
                {workspace.items.filter((i) => i.enabled).length} of {workspace.items.length} enabled
              </span>

              <div className={styles.addItemGroup}>
                <button className={styles.addItemBtn} onClick={() => handleOpenAddItem('application')}>
                  <AppWindow size={14} />
                  <span>+ Application</span>
                </button>
                <button className={styles.addItemBtn} onClick={() => handleOpenAddItem('folder')}>
                  <Folder size={14} />
                  <span>+ Folder</span>
                </button>
                <button className={styles.addItemBtn} onClick={() => handleOpenAddItem('url')}>
                  <Globe size={14} />
                  <span>+ Website</span>
                </button>
                <button className={styles.addItemBtn} onClick={() => handleOpenAddItem('terminal')}>
                  <Terminal size={14} />
                  <span>+ Terminal</span>
                </button>
              </div>
            </div>

            {workspace.items.length === 0 ? (
              <div className={styles.emptyBox}>
                <Layers size={32} color="var(--text-tertiary)" />
                <p>No launch items configured for this workspace.</p>
                <p style={{ fontSize: 'var(--font-size-xs)' }}>
                  Add apps, folders, links, or terminal paths to automatically open when launched.
                </p>
              </div>
            ) : (
              <div className={styles.itemsList}>
                {workspace.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`${styles.itemRow} ${!item.enabled ? styles.itemRowDisabled : ''} ${
                      item.isMissing ? styles.itemRowWarning : ''
                    }`}
                  >
                    <div className={styles.itemIcon}>{renderItemIcon(item.type)}</div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>
                        <span>{item.name}</span>
                        {item.isMissing && (
                          <span
                            className={styles.missingBadge}
                            title="Path does not exist on disk"
                          >
                            <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
                            Missing Location
                          </span>
                        )}
                      </div>
                      <div className={styles.itemPath} title={renderItemSubtitle(item)}>
                        {renderItemSubtitle(item)}
                      </div>
                    </div>

                    <div className={styles.itemActions}>
                      <label className={styles.switch} title={item.enabled ? 'Enabled' : 'Disabled'}>
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => handleToggleItem(item)}
                        />
                        <span className={styles.slider} />
                      </label>

                      <button
                        className={styles.iconBtn}
                        onClick={() => handleMoveItem(index, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                      >
                        <ChevronUp size={16} />
                      </button>

                      <button
                        className={styles.iconBtn}
                        onClick={() => handleMoveItem(index, 'down')}
                        disabled={index === workspace.items.length - 1}
                        title="Move Down"
                      >
                        <ChevronDown size={16} />
                      </button>

                      <button
                        className={styles.iconBtn}
                        onClick={() => handleOpenEditItem(item)}
                        title="Edit Item"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        className={styles.iconBtn}
                        onClick={() => handleDeleteItem(item.id)}
                        title="Remove Item"
                      >
                        <Trash2 size={15} color="var(--status-error)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className={styles.notesContainer}>
            <div className={styles.notesHeader}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Workspace Notes</span>
              <div className={styles.saveStatus}>
                {noteStatus === 'saving' && (
                  <>
                    <RotateCw size={12} className={styles.spin} />
                    <span>Saving...</span>
                  </>
                )}
                {noteStatus === 'saved' && (
                  <>
                    <Check size={12} color="var(--status-success)" />
                    <span>Saved</span>
                  </>
                )}
                {noteStatus === 'error' && (
                  <>
                    <AlertTriangle size={12} color="var(--status-error)" />
                    <span style={{ color: 'var(--status-error)' }}>Save failed</span>
                  </>
                )}
              </div>
            </div>

            <textarea
              className={styles.notesTextarea}
              placeholder="Record your thoughts, project scratchpad, links, or task context..."
              value={noteContent}
              onChange={(e) => handleNoteChange(e.target.value)}
              onBlur={handleNoteBlur}
            />
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className={styles.checklistCard}>
            {totalTasks > 0 && (
              <div className={styles.progressArea}>
                <div className={styles.progressLabel}>
                  <span>Progress</span>
                  <span>{completedTasks} of {totalTasks} completed ({progressPercent}%)</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleAddTask} className={styles.addTaskRow}>
              <input
                type="text"
                className={styles.taskInput}
                placeholder="Add a new checklist task (press Enter)..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <button type="submit" className={styles.addItemBtn}>
                <Plus size={14} />
                <span>Add Task</span>
              </button>
            </form>

            {totalTasks === 0 ? (
              <div className={styles.emptyBox}>
                <CheckSquare size={32} color="var(--text-tertiary)" />
                <p>No tasks added yet.</p>
                <p style={{ fontSize: 'var(--font-size-xs)' }}>
                  Keep track of action items needed when opening this workspace.
                </p>
              </div>
            ) : (
              <div className={styles.tasksList}>
                {workspace.tasks.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <input
                      type="checkbox"
                      className={styles.taskCheckbox}
                      checked={task.isCompleted}
                      onChange={() => handleToggleTask(task.id, task.isCompleted)}
                    />
                    <span
                      className={`${styles.taskTitle} ${task.isCompleted ? styles.taskCompleted : ''}`}
                      onClick={() => handleToggleTask(task.id, task.isCompleted)}
                    >
                      {task.title}
                    </span>
                    <button
                      className={styles.iconBtn}
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                    >
                      <Trash2 size={14} color="var(--text-tertiary)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSubmit={handleSaveItem}
        itemToEdit={itemToEdit}
        initialType={itemInitialType}
      />
    </div>
  );
};
