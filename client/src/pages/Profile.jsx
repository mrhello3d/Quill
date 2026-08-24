import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth-context.jsx';
import Avatar from '../components/Avatar.jsx';
import PostCard from '../components/PostCard.jsx';
import { formatMonthYear } from '../util/format.js';

export default function Profile() {
  const { username } = useParams();
  const { user, updateUser } = useAuth();
  const isSelf = user && user.username === username;

  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');

  const [tab, setTab] = useState('published');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setEditing(false);
    setTab('published');
    api(`/users/${username}`)
      .then((d) => {
        if (!alive) return;
        setProfile(d.user);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('missing'));
    return () => {
      alive = false;
    };
  }, [username]);

  useEffect(() => {
    let alive = true;
    setLoadingPosts(true);
    const drafts = isSelf && tab === 'drafts' ? '?drafts=true' : '';
    api(`/users/${username}/posts${drafts}`)
      .then((d) => alive && setPosts(d.posts))
      .catch(() => {})
      .finally(() => alive && setLoadingPosts(false));
    return () => {
      alive = false;
    };
  }, [username, tab, isSelf]);

  if (status === 'loading') return <div className="state-note">Loading profile…</div>;
  if (status === 'missing') {
    return (
      <div className="state-page">
        <h1 className="serif">Writer not found.</h1>
        <p>No one writes under @{username} — yet.</p>
        <Link to="/" className="btn btn-primary">Back to the feed</Link>
      </div>
    );
  }

  const startEdit = () => {
    setForm({
      name: profile.name,
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
    });
    setError('');
    setEditing(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const d = await api('/users/me', { method: 'PATCH', body: form });
      setProfile((p) => ({ ...p, ...d.user }));
      updateUser(d.user);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile">
      <header className="profile-head">
        <Avatar name={profile.name} url={profile.avatar_url} size={88} />
        <div className="profile-id">
          <h1 className="serif">{profile.name}</h1>
          <p className="muted">@{profile.username}</p>
          {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}
          <p className="profile-stats">
            <span><strong>{profile.post_count}</strong> stories</span>
            <span className="dot">·</span>
            <span><strong>{profile.total_claps}</strong> claps received</span>
            <span className="dot">·</span>
            <span>joined {formatMonthYear(profile.created_at)}</span>
          </p>
        </div>
        {isSelf && !editing && (
          <button type="button" className="btn btn-ghost profile-edit" onClick={startEdit}>
            Edit profile
          </button>
        )}
      </header>

      {editing && (
        <form className="profile-form" onSubmit={saveProfile}>
          <label>
            Name
            <input
              value={form.name}
              maxLength={60}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            Bio
            <textarea
              rows={2}
              value={form.bio}
              maxLength={280}
              placeholder="One or two lines about you"
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </label>
          <label>
            Avatar URL
            <input
              type="url"
              value={form.avatar_url}
              placeholder="https://…"
              onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="profile-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      <nav className="seg seg-left" aria-label="Story tabs">
        <button type="button" className={tab === 'published' ? 'on' : ''} onClick={() => setTab('published')}>
          Published
        </button>
        {isSelf && (
          <button type="button" className={tab === 'drafts' ? 'on' : ''} onClick={() => setTab('drafts')}>
            Drafts
          </button>
        )}
      </nav>

      {loadingPosts ? (
        <div className="state-note">Loading stories…</div>
      ) : posts.length === 0 ? (
        <div className="state-note">
          <p>
            {tab === 'drafts'
              ? 'No drafts waiting. Your published stories live on the other tab.'
              : `Nothing published by @${username} yet.`}
          </p>
          {isSelf && tab === 'published' && (
            <Link to="/write" className="btn btn-primary">Write a story</Link>
          )}
        </div>
      ) : (
        <div className="feed-list feed-list-tight">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
