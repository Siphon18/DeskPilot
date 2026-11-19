import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { WorkspaceDTO } from '../lib/types';
import styles from './DeleteModal.module.css';

interface DeleteModalProps {
  workspace: WorkspaceDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  workspace,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !workspace) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(workspace.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <AlertTriangle size={20} />
          <h2 className={styles.title}>Delete Workspace</h2>
        </div>

        <div className={styles.content}>
          <p>
            Are you sure you want to permanently delete{' '}
            <span className={styles.highlight}>"{workspace.name}"</span>?
          </p>
          <p>
            This action will remove its saved launch items, notes, and checklist tasks from DeskPilot.
            Past launch history will be preserved as an unlinked snapshot.
          </p>
          <div className={styles.notice}>
            None of your actual application executables, project folders, or files will be modified or deleted.
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};
