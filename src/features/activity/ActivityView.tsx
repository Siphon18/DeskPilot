import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { LaunchRunDTO } from '../../lib/types';
import { desktopApi } from '../../lib/desktop-api';
import { LaunchModal } from '../../components/LaunchModal';
import styles from './ActivityView.module.css';

export const ActivityView: React.FC = () => {
  const [runs, setRuns] = useState<LaunchRunDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    desktopApi.launch.listRuns(50).then((data) => {
      setRuns(data);
      setIsLoading(false);
    });
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') {
      return (
        <div className={`${styles.statusIcon} ${styles.statusSuccess}`}>
          <CheckCircle2 size={16} />
        </div>
      );
    }
    if (status === 'completed_with_errors') {
      return (
        <div className={`${styles.statusIcon} ${styles.statusWarning}`}>
          <AlertTriangle size={16} />
        </div>
      );
    }
    return (
      <div className={`${styles.statusIcon} ${styles.statusError}`}>
        <XCircle size={16} />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Activity History</h1>
        <p className={styles.subtitle}>Audit past workspace launch runs and per-item results</p>
      </div>

      {isLoading ? (
        <div>Loading history...</div>
      ) : runs.length === 0 ? (
        <div className={styles.emptyCard}>
          <History size={36} color="var(--text-tertiary)" />
          <p>No launch runs recorded yet.</p>
          <p style={{ fontSize: 'var(--font-size-xs)' }}>
            Launch a workspace to inspect item timings and outcomes here.
          </p>
        </div>
      ) : (
        <div className={styles.runsList}>
          {runs.map((run) => (
            <div
              key={run.id}
              className={styles.runRow}
              onClick={() => setSelectedRun({ id: run.id, name: run.workspaceNameSnapshot })}
            >
              <div className={styles.runMain}>
                {getStatusIcon(run.status)}
                <div className={styles.runInfo}>
                  <span className={styles.workspaceName}>{run.workspaceNameSnapshot}</span>
                  <span className={styles.runTime}>{formatTime(run.startedAt)}</span>
                </div>
              </div>

              <div className={styles.runStats}>
                <span className={styles.statBadge}>
                  {run.successCount} of {run.totalCount} succeeded
                </span>
                {run.failedCount > 0 && (
                  <span
                    className={styles.statBadge}
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error)' }}
                  >
                    {run.failedCount} failed
                  </span>
                )}
                {run.warningCount > 0 && (
                  <span
                    className={styles.statBadge}
                    style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}
                  >
                    {run.warningCount} warnings
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRun && (
        <LaunchModal
          runId={selectedRun.id}
          workspaceName={selectedRun.name}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
};
