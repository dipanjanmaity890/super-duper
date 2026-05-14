import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function AuthPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [mode,       setMode]       = useState('login');
  const [form,       setForm]       = useState({ username: '', email: '', password: '' });
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Wordmark */}
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Fan<span className={styles.logoAccent}>Pulse</span>
        </div>
        <p className={styles.tagline}>The second screen for live sports fans</p>

        {/* ── Google Sign-In Button ───────────────────────────────────── */}
        <button
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={googleBusy || loading}
          type="button"
        >
          {googleBusy ? (
            <span className={styles.googleSpinner} />
          ) : (
            <svg className={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span>{googleBusy ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or use email</span>
          <span className={styles.dividerLine} />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Sign in
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Create account
          </button>
        </div>

        {/* ── Email form ──────────────────────────────────────────────── */}
        <form className={styles.form} onSubmit={submit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>Username</label>
              <input
                value={form.username}
                onChange={set('username')}
                placeholder="e.g. TacticalAce"
                required
                autoFocus
                minLength={3}
                maxLength={30}
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 6 characters"
              required
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading || googleBusy}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className={styles.features}>
          <div className={styles.feature}><span>⚡</span> Real-time polls</div>
          <div className={styles.feature}><span>🎯</span> Predictions</div>
          <div className={styles.feature}><span>🏆</span> Live rankings</div>
        </div>
      </div>
    </div>
  );
}
