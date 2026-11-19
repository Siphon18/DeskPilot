import React, { useState, useEffect } from 'react';
import { X, AppWindow, Folder, Globe, Terminal, Plus, Trash2 } from 'lucide-react';
import type { LaunchItemDTO, LaunchItemType } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import styles from './ItemModal.module.css';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (itemData: any) => Promise<void>;
  itemToEdit?: LaunchItemDTO | null;
  initialType?: LaunchItemType;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  itemToEdit,
  initialType = 'application',
}) => {
  const [itemType, setItemType] = useState<LaunchItemType>(initialType);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Application fields
  const [executablePath, setExecutablePath] = useState('');
  const [args, setArgs] = useState<string[]>([]);
  const [appWorkingDir, setAppWorkingDir] = useState('');

  // Folder fields
  const [folderPath, setFolderPath] = useState('');

  // URL fields
  const [url, setUrl] = useState('');

  // Terminal fields
  const [terminalWorkingDir, setTerminalWorkingDir] = useState('');
  const [terminalType, setTerminalType] = useState<'windowsTerminal' | 'powershell'>('windowsTerminal');
  const [allowFallback, setAllowFallback] = useState(true);

  useEffect(() => {
    if (itemToEdit) {
      setItemType(itemToEdit.type);
      setName(itemToEdit.name);

      const cfg: any = itemToEdit.config;
      if (itemToEdit.type === 'application') {
        setExecutablePath(cfg.executablePath || '');
        setArgs(cfg.args || []);
        setAppWorkingDir(cfg.workingDirectory || '');
      } else if (itemToEdit.type === 'folder') {
        setFolderPath(cfg.path || '');
      } else if (itemToEdit.type === 'url') {
        setUrl(cfg.url || '');
      } else if (itemToEdit.type === 'terminal') {
        setTerminalWorkingDir(cfg.workingDirectory || '');
        setTerminalType(cfg.terminal || 'windowsTerminal');
        setAllowFallback(cfg.allowFallback ?? true);
      }
    } else {
      setItemType(initialType);
      setName('');
      setExecutablePath('');
      setArgs([]);
      setAppWorkingDir('');
      setFolderPath('');
      setUrl('');
      setTerminalWorkingDir('');
      setTerminalType('windowsTerminal');
      setAllowFallback(true);
    }
    setErrors({});
  }, [itemToEdit, initialType, isOpen]);

  if (!isOpen) return null;

  // Pickers
  const handlePickExecutable = async () => {
    try {
      const path = await desktopApi.items.pickExecutable();
      if (path) {
        setExecutablePath(path);
        if (!name) {
          // Auto-derive a friendly name from the filename
          const filename = path.split(/[\\/]/).pop()?.replace(/\.(exe|lnk)$/i, '') || '';
          setName(filename);
        }
      }
    } catch (e: any) {
      setErrors({ executablePath: 'Failed to pick executable' });
    }
  };

  const handlePickFolder = async (target: 'folder' | 'terminal' | 'appWorkingDir') => {
    try {
      const path = await desktopApi.items.pickFolder();
      if (path) {
        if (target === 'folder') {
          setFolderPath(path);
          if (!name) {
            const folderName = path.split(/[\\/]/).pop() || '';
            setName(folderName);
          }
        } else if (target === 'terminal') {
          setTerminalWorkingDir(path);
          if (!name) {
            const folderName = path.split(/[\\/]/).pop() || '';
            setName(`Terminal: ${folderName}`);
          }
        } else if (target === 'appWorkingDir') {
          setAppWorkingDir(path);
        }
      }
    } catch (e: any) {
      setErrors({ form: 'Failed to pick directory' });
    }
  };

  // Args management
  const handleAddArg = () => setArgs([...args, '']);
  const handleArgChange = (index: number, val: string) => {
    const updated = [...args];
    updated[index] = val;
    setArgs(updated);
  };
  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Display name is required';
    }

    let config: any = {};

    if (itemType === 'application') {
      if (!executablePath.trim()) {
        newErrors.executablePath = 'Executable path is required';
      } else {
        const lower = executablePath.toLowerCase();
        if (!lower.endsWith('.exe') && !lower.endsWith('.lnk')) {
          newErrors.executablePath = 'Must be an executable (.exe) or Windows shortcut (.lnk)';
        }
      }
      config = {
        type: 'application',
        executablePath: executablePath.trim(),
        args: args.map((a) => a.trim()).filter(Boolean),
        workingDirectory: appWorkingDir.trim() || undefined,
      };
    } else if (itemType === 'folder') {
      if (!folderPath.trim()) {
        newErrors.folderPath = 'Folder location is required';
      }
      config = {
        type: 'folder',
        path: folderPath.trim(),
      };
    } else if (itemType === 'url') {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        newErrors.url = 'URL is required';
      } else if (!/^https?:\/\//i.test(trimmedUrl)) {
        newErrors.url = 'Must be a valid URL starting with http:// or https://';
      }
      config = {
        type: 'url',
        url: trimmedUrl,
      };
    } else if (itemType === 'terminal') {
      if (!terminalWorkingDir.trim()) {
        newErrors.terminalWorkingDir = 'Working directory is required';
      }
      config = {
        type: 'terminal',
        workingDirectory: terminalWorkingDir.trim(),
        terminal: terminalType,
        allowFallback,
      };
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit({
        type: itemType,
        name: name.trim(),
        config,
        enabled: itemToEdit ? itemToEdit.enabled : true,
      });
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save launch item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {itemToEdit ? 'Edit Launch Item' : 'Add Launch Item'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {!itemToEdit && (
          <div className={styles.typeTabs}>
            <button
              type="button"
              className={`${styles.typeTab} ${itemType === 'application' ? styles.typeTabActive : ''}`}
              onClick={() => setItemType('application')}
            >
              <AppWindow size={16} />
              <span>Application</span>
            </button>
            <button
              type="button"
              className={`${styles.typeTab} ${itemType === 'folder' ? styles.typeTabActive : ''}`}
              onClick={() => setItemType('folder')}
            >
              <Folder size={16} />
              <span>Folder</span>
            </button>
            <button
              type="button"
              className={`${styles.typeTab} ${itemType === 'url' ? styles.typeTabActive : ''}`}
              onClick={() => setItemType('url')}
            >
              <Globe size={16} />
              <span>Website</span>
            </button>
            <button
              type="button"
              className={`${styles.typeTab} ${itemType === 'terminal' ? styles.typeTabActive : ''}`}
              onClick={() => setItemType('terminal')}
            >
              <Terminal size={16} />
              <span>Terminal</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.form && <div className={styles.errorText}>{errors.form}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Display Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Visual Studio Code, API Docs, Backend Terminal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          {/* APPLICATION FIELDS */}
          {itemType === 'application' && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Executable or Shortcut (.exe, .lnk) *</label>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="C:\Program Files\..."
                    value={executablePath}
                    onChange={(e) => setExecutablePath(e.target.value)}
                  />
                  <button type="button" className={styles.browseBtn} onClick={handlePickExecutable}>
                    Browse
                  </button>
                </div>
                {errors.executablePath && (
                  <span className={styles.errorText}>{errors.executablePath}</span>
                )}
                <span className={styles.helperText}>
                  Launches directly without command prompt or shell interpreters.
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Working Directory (Optional)</label>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Defaults to executable directory"
                    value={appWorkingDir}
                    onChange={(e) => setAppWorkingDir(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.browseBtn}
                    onClick={() => handlePickFolder('appWorkingDir')}
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Launch Arguments (Optional)</label>
                <div className={styles.argsList}>
                  {args.map((arg, idx) => (
                    <div key={idx} className={styles.argRow}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder={`Argument ${idx + 1}`}
                        value={arg}
                        onChange={(e) => handleArgChange(idx, e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.browseBtn}
                        onClick={() => handleRemoveArg(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className={styles.addArgBtn} onClick={handleAddArg}>
                    <Plus size={14} />
                    <span>Add Argument</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* FOLDER FIELDS */}
          {itemType === 'folder' && (
            <div className={styles.field}>
              <label className={styles.label}>Directory Path *</label>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="C:\Users\..."
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.browseBtn}
                  onClick={() => handlePickFolder('folder')}
                >
                  Browse Folder
                </button>
              </div>
              {errors.folderPath && <span className={styles.errorText}>{errors.folderPath}</span>}
              <span className={styles.helperText}>Opens in Windows File Explorer.</span>
            </div>
          )}

          {/* URL FIELDS */}
          {itemType === 'url' && (
            <div className={styles.field}>
              <label className={styles.label}>Web Address (HTTP / HTTPS) *</label>
              <input
                type="url"
                className={styles.input}
                placeholder="https://github.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              {errors.url && <span className={styles.errorText}>{errors.url}</span>}
              <span className={styles.helperText}>
                Opens in your default browser. Your browser decides whether it opens in a new tab or window.
              </span>
            </div>
          )}

          {/* TERMINAL FIELDS */}
          {itemType === 'terminal' && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Working Directory *</label>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="C:\Users\..."
                    value={terminalWorkingDir}
                    onChange={(e) => setTerminalWorkingDir(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.browseBtn}
                    onClick={() => handlePickFolder('terminal')}
                  >
                    Browse Folder
                  </button>
                </div>
                {errors.terminalWorkingDir && (
                  <span className={styles.errorText}>{errors.terminalWorkingDir}</span>
                )}
                <span className={styles.helperText}>
                  Opens a terminal window focused on this directory. No arbitrary commands will be executed.
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Terminal Program</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="terminalType"
                      value="windowsTerminal"
                      checked={terminalType === 'windowsTerminal'}
                      onChange={() => setTerminalType('windowsTerminal')}
                    />
                    <span>Windows Terminal (wt.exe)</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="terminalType"
                      value="powershell"
                      checked={terminalType === 'powershell'}
                      onChange={() => setTerminalType('powershell')}
                    />
                    <span>PowerShell</span>
                  </label>
                </div>

                {terminalType === 'windowsTerminal' && (
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={allowFallback}
                      onChange={(e) => setAllowFallback(e.target.checked)}
                    />
                    <span>Fallback to PowerShell if Windows Terminal cannot be started</span>
                  </label>
                )}
              </div>
            </>
          )}
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : itemToEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};
