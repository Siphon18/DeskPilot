import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, RotateCw } from 'lucide-react';
import type { LaunchProgressEvent, LaunchRunDetailDTO } from '../lib/types';
import { desktopApi, onLaunchProgress } from '../lib/desktop-api';
import styles from './LaunchModal.module.css';

interface LaunchModalProps {
  runId: string | null;
  workspaceName: string;
  onClose: () => void;
}

export const LaunchModal: React.FC<LaunchModalProps> = ({
  runId,
  workspaceName,
  onClose,
}) => {
  const [progress, setProgress] = useState<LaunchProgressEvent | null>(null);
  const [runDetail, setRunDetail] = useState<LaunchRunDetailDTO | null>(null);

  useEffect(() => {
    if (!runId) return;

    let unlistenFn: (() => void) | null = null;

    onLaunchProgress((event) => {
      if (event.runId === runId) {
        setProgress(event);
        if (event.overallStatus !== 'running') {
          // Fetch complete run detail
          desktopApi.launch.getRun(runId).then((res) => {
            if (res) setRunDetail(res);
          });
        }
      }
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [runId]);

  if (!runId) return null;

  const total = progress?.totalCount || 1;
  const completed = progress?.completedCount || 0;
  const percent = Math.min(100, Math.round((completed / total) * 100));
  const isFinished = progress ? progress.overallStatus !== 'running' : false;

  return (
    <div className={styles.overlay} onClick={isFinished ? onClose : undefined}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Launching {workspaceName}</h2>
          {isFinished && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
              <X size={18} />
            </button>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.progressHeader}>
            <span>
              {isFinished
                ? progress?.overallStatus === 'completed'
                  ? 'All items opened successfully'
                  : progress?.overallStatus === 'completed_with_errors'
                  ? 'Completed with warnings or errors'
                  : 'Launch failed'
                : `Opening items (${completed} of ${total})...`}
            </span>
            <span>{percent}%</span>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${
                isFinished
                  ? progress?.overallStatus === 'completed'
                    ? styles.progressFillSuccess
                    : progress?.overallStatus === 'completed_with_errors'
                    ? styles.progressFillWarning
                    : styles.progressFillError
                  : ''
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {runDetail && (
            <div className={styles.itemsList}>
              {runDetail.items.map((item, idx) => (
                <div key={idx} className={styles.itemResultRow}>
                  <div className={styles.itemIcon}>
                    {item.status === 'success' && (
                      <CheckCircle2 size={16} color="var(--status-success)" />
                    )}
                    {item.status === 'warning' && (
                      <AlertTriangle size={16} color="var(--status-warning)" />
                    )}
                    {item.status === 'failed' && (
                      <XCircle size={16} color="var(--status-error)" />
                    )}
                    {item.status === 'running' && (
                      <RotateCw size={14} className={styles.spin} />
                    )}
                  </div>
                  <span className={styles.itemName}>{item.itemName}</span>
                  <span className={styles.itemMessage}>
                    {item.message} {item.durationMs ? `(${item.durationMs}ms)` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isFinished && (
          <div className={styles.footer}>
            <button type="button" className={styles.doneBtn} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
