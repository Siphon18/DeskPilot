import React, { useState, useEffect } from 'react';
import { FileText, Save, Check } from 'lucide-react';
import type { WorkspaceDTO } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import { useToast } from '../../components/Toast';
import styles from './QuickNotesView.module.css';

interface QuickNotesViewProps {
  workspaces: WorkspaceDTO[];
}

export const QuickNotesView: React.FC<QuickNotesViewProps> = ({ workspaces }) => {
  const [selectedWsId, setSelectedWsId] = useState<string>(workspaces[0]?.id || '');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (workspaces.length > 0 && !selectedWsId) {
      setSelectedWsId(workspaces[0].id);
    }
  }, [workspaces, selectedWsId]);

  useEffect(() => {
    if (!selectedWsId) return;
    desktopApi.workspaces.get(selectedWsId).then((ws) => {
      if (ws) {
        setNoteContent(ws.note || '');
      }
    });
  }, [selectedWsId]);

  const handleSave = async () => {
    if (!selectedWsId) return;
    setIsSaving(true);
    try {
      await desktopApi.notes.save(selectedWsId, noteContent);
      setIsSaved(true);
      showToast('Note saved successfully', 'success');
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      showToast(err.message || 'Failed to save note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headingArea}>
          <h1 className={styles.title}>Quick Notes</h1>
          <p className={styles.subtitle}>Workspace notes and scratchpad saved locally on your PC</p>
        </div>

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={isSaving || !selectedWsId}
        >
          {isSaved ? <Check size={16} /> : <Save size={16} />}
          <span>{isSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save Note'}</span>
        </button>
      </div>

      <div className={styles.contentLayout}>
        <div className={styles.workspaceSelector}>
          <span className={styles.selectorLabel}>Select Workspace:</span>
          <div className={styles.workspacePills}>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className={`${styles.pill} ${ws.id === selectedWsId ? styles.pillActive : ''}`}
                onClick={() => setSelectedWsId(ws.id)}
              >
                <FileText size={14} />
                <span>{ws.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.editorArea}>
          <textarea
            className={styles.textarea}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Type your markdown notes, API keys, ideas, or to-dos here..."
            rows={18}
          />
        </div>
      </div>
    </div>
  );
};
