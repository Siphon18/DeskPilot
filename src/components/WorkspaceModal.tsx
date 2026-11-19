import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { X } from 'lucide-react';
import type { WorkspaceDTO, CreateWorkspaceInput, UpdateWorkspaceInput } from '../lib/types';
import { IconRenderer, AVAILABLE_ICONS, AVAILABLE_COLORS } from './IconRenderer';
import styles from './WorkspaceModal.module.css';

const workspaceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Name must be 40 characters or less'),
  description: z.string().max(160, 'Description must be 160 characters or less').optional(),
  icon: z.string(),
  color: z.string(),
  isFavorite: z.boolean(),
});

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkspaceInput | UpdateWorkspaceInput) => Promise<void>;
  workspaceToEdit?: WorkspaceDTO | null;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  workspaceToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('layout-grid');
  const [color, setColor] = useState('blue');
  const [isFavorite, setIsFavorite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workspaceToEdit) {
      setName(workspaceToEdit.name);
      setDescription(workspaceToEdit.description);
      setIcon(workspaceToEdit.icon);
      setColor(workspaceToEdit.color);
      setIsFavorite(workspaceToEdit.isFavorite);
    } else {
      setName('');
      setDescription('');
      setIcon('layout-grid');
      setColor('blue');
      setIsFavorite(false);
    }
    setErrors({});
  }, [workspaceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = workspaceSchema.safeParse({
      name,
      description,
      icon,
      color,
      isFavorite,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save workspace' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            {workspaceToEdit ? 'Edit Workspace' : 'Create New Workspace'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.form && <div className={styles.errorText}>{errors.form}</div>}

          <div className={styles.field}>
            <label className={styles.label}>
              <span>Workspace Name *</span>
              <span className={styles.counter}>{name.length}/40</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Development, Study, Finance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <span>Description</span>
              <span className={styles.counter}>{description.length}/160</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Optional summary of this workspace setup"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={160}
              rows={2}
            />
            {errors.description && <span className={styles.errorText}>{errors.description}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <span>Icon</span>
            </label>
            <div className={styles.pickerGrid}>
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`${styles.iconChoice} ${icon === ic ? styles.iconSelected : ''}`}
                  onClick={() => setIcon(ic)}
                  title={ic}
                >
                  <IconRenderer name={ic} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <span>Accent Color</span>
            </label>
            <div className={styles.colorRow}>
              {AVAILABLE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`${styles.colorDot} ${color === c.id ? styles.colorDotSelected : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
            />
            <span>Add to Favorites (pins to top of overview & quick switcher)</span>
          </label>
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
            {isSubmitting ? 'Saving...' : workspaceToEdit ? 'Save Changes' : 'Create Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};
