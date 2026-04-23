import { Mail, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { email, handleLogout } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <Shield size={18} />
          </div>
          <div>
            <h3 className={styles.cardTitle}>Account</h3>
            <p className={styles.cardDesc}>Manage your profile and session.</p>
          </div>
        </div>

        <div className={styles.accountRow}>
          <div className={styles.accountInfo}>
            <Mail size={16} />
            <div>
              <label className={styles.accountLabel}>Email</label>
              <span className={styles.accountValue}>{email}</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className="btn-danger" onClick={handleLogout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
