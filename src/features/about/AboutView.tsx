import React from 'react';
import { Navigation, ShieldCheck, Zap, HardDrive, Keyboard } from 'lucide-react';
import styles from './AboutView.module.css';

export const AboutView: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.brandBadge}>
          <Navigation size={28} className={styles.brandIcon} />
        </div>
        <div className={styles.brandText}>
          <h1 className={styles.title}>DeskPilot</h1>
          <p className={styles.version}>Version 1.0.0 (Windows 11 Native)</p>
        </div>
      </div>

      <p className={styles.leadText}>
        A local-first Windows 11 workspace launcher that restores your full working context in one single click.
      </p>

      <div className={styles.featureGrid}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Zap size={20} color="#38bdf8" />
          </div>
          <div className={styles.featureInfo}>
            <h3>1-Click Desktop Capture</h3>
            <p>Automatically snapshot all visible open user applications into a workspace without manual setup.</p>
          </div>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Keyboard size={20} color="#a855f7" />
          </div>
          <div className={styles.featureInfo}>
            <h3>Quick Launcher (Ctrl + Space)</h3>
            <p>Summon the compact acrylic side panel from anywhere to instantly search and trigger any workspace.</p>
          </div>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <ShieldCheck size={20} color="#10b981" />
          </div>
          <div className={styles.featureInfo}>
            <h3>100% Private & Local-First</h3>
            <p>Zero cloud dependencies, no analytics, no telemetry. Your database stays securely in %LOCALAPPDATA%.</p>
          </div>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <HardDrive size={20} color="#f59e0b" />
          </div>
          <div className={styles.featureInfo}>
            <h3>Native Rust Performance</h3>
            <p>Powered by Tauri 2, system WebView2, and Rust backend adapters with instant cold-start and zero bloat.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
