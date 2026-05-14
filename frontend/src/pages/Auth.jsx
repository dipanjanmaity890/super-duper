import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode,    setMode]    = useState('login');   // 'login' | 'register'
  const [form,    setForm]    = useState({ username: '', email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Wordmark */}
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Fan<span className={styles.logoAccent}>Pulse</span>
        </div>
        <p className={styles.tagline}>The second screen for live sports fans</p>

        {/* Tabs */}
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

          <button
            className={styles.submit}
            type="submit"
            disabled={loading}
          >
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
