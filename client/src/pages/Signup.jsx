import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError('Password needs at least 8 characters.');
    setBusy(true);
    setError('');
    try {
      await signup({ ...form, username: form.username.toLowerCase() });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <h1 className="serif">Join Quill.</h1>
      <p className="auth-sub">Short essays, honest readers. Your desk is ready.</p>

      <form onSubmit={submit} className="auth-form">
        <label>
          Name
          <input value={form.name} maxLength={60} onChange={set('name')} autoFocus />
        </label>
        <label>
          Username
          <input
            value={form.username}
            pattern="[a-z0-9_]{3,24}"
            title="3-24 characters: lowercase letters, numbers, underscores"
            placeholder="lowercase_letters_only"
            onChange={(e) => set('username')({ target: { value: e.target.value.toLowerCase() } })}
          />
        </label>
        <label>
          Email
          <input type="email" value={form.email} autoComplete="email" onChange={set('email')} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            autoComplete="new-password"
            minLength={8}
            onChange={set('password')}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-wide" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-swap">
        Already have an account? <Link to="/login" className="text-link">Sign in</Link>
      </p>
    </div>
  );
}
