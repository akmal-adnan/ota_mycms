import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Layers, Zap, Shield, Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { isAuthenticated, loading, error, handleLogin, handleSignup } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSignup) {
      await handleSignup(email, password);
    } else {
      handleLogin(email, password);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.brandLogo}>
            <Layers size={24} />
          </div>
          <h1 className={styles.brandTitle}>OTA Manager</h1>
          <p className={styles.brandTagline}>
            Ship React Native updates instantly — no app store review needed.
          </p>
          <div className={styles.features}>
            <div className={styles.feature}>
              <Zap size={16} />
              <span>Instant OTA updates</span>
            </div>
            <div className={styles.feature}>
              <Shield size={16} />
              <span>Secure bundle delivery</span>
            </div>
            <div className={styles.feature}>
              <Globe size={16} />
              <span>Android & iOS support</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.formPanel}>
        <form className={styles.formWrapper} onSubmit={onSubmit}>
          <div className={styles.formHeader}>
            <h2>{isSignup ? 'Create an account' : 'Welcome back'}</h2>
            <p>
              {isSignup
                ? 'Get started with OTA bundle management'
                : 'Sign in to manage your bundles'}
            </p>
          </div>

          {error && <div className="alert error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn-primary full-width"
            disabled={loading}
          >
            {loading
              ? isSignup
                ? 'Creating account...'
                : 'Signing in...'
              : isSignup
                ? 'Create Account'
                : 'Sign In'}
          </button>

          <p className={styles.authToggle}>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
