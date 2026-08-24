import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth-context.jsx';
import Avatar from '../components/Avatar.jsx';
import { formatDate, excerptFrom } from '../util/format.js';
import { TrashIcon } from '../components/icons.jsx';

const TABS = [
  ['overview', 'Overview'],
  ['stories', 'Stories'],
  ['writers', 'Writers'],
  ['responses', 'Responses'],
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');

  return (
    <div className="admin">
      <header className="admin-head">
        <p className="eyebrow">Quill administration</p>
        <h1 className="serif">Dashboard</h1>
        <p className="muted">
          Signed in as {user.name} — changes here apply to the whole publication.
        </p>
        <nav className="seg seg-left" aria-label="Admin sections">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'overview' && <Overview />}
      {tab === 'stories' && <Stories />}
      {tab === 'writers' && <Writers selfId={user.id} />}
      {tab === 'responses' && <Responses />}
    </div>
  );
}

/* ---------------- overview ---------------- */

function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <div className="state-note">Crunching the numbers…</div>;

  const { totals, series, topStories } = data;
  const day = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <>
      <div className="tiles">
        <Tile label="Writers" value={totals.users} />
        <Tile label="Stories" value={totals.stories} />
        <Tile label="Published" value={totals.published} />
        <Tile label="Drafts" value={totals.drafts} />
        <Tile label="Claps" value={totals.claps} />
        <Tile label="Responses" value={totals.responses} />
      </div>

      <div className="charts">
        <Bars
          title="Stories · last 14 days"
          data={series.map((s) => ({ label: day(s.day), value: s.stories }))}
        />
        <Bars
          title="New writers · last 14 days"
          data={series.map((s) => ({ label: day(s.day), value: s.signups }))}
        />
      </div>

      <section className="panel">
        <h3>Most clapped stories</h3>
        <table className="atable">
          <thead>
            <tr>
              <th>Story</th>
              <th>Writer</th>
              <th>Status</th>
              <th className="num">Claps</th>
              <th className="num">Responses</th>
            </tr>
          </thead>
          <tbody>
            {topStories.map((s) => (
              <tr key={s.slug}>
                <td>
                  <Link className="atable-title" to={`/post/${s.slug}`}>{s.title}</Link>
                </td>
                <td><Link to={`/user/${s.author_username}`}>{s.author_name}</Link></td>
                <td><StatusPill published={s.published} /></td>
                <td className="num">{s.clap_count}</td>
                <td className="num">{s.comment_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Tile({ label, value }) {
  return (
    <div className="tile">
      <span className="tile-num serif">{value}</span>
      <span className="tile-label">{label}</span>
    </div>
  );
}

function Bars({ title, data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="chart">
      <h3>{title}</h3>
      <div className="chart-bars">
        {data.map((d, i) => (
          <div key={i} className="chart-col" title={`${d.label}: ${d.value}`}>
            <div className="chart-bar" style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
            <span>{d.value > 0 ? d.value : ''}</span>
            <span className="chart-day">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ published }) {
  return published ? (
    <span className="status-pill status-pub">Published</span>
  ) : (
    <span className="status-pill status-draft">Draft</span>
  );
}

/* ---------------- stories ---------------- */

function Stories() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    setError('');
    const qs = new URLSearchParams({ q: query, status });
    api(`/admin/posts?${qs}`)
      .then((d) => alive && setPosts(d.posts))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [query, status]);

  const setStatusFor = async (post, published) => {
    setBusyId(post.id);
    setError('');
    try {
      const d = await api(`/admin/posts/${post.id}/status`, {
        method: 'PATCH',
        body: { published },
      });
      setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, ...d.post } : p)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (post) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete “${post.title}” permanently?`)) return;
    setBusyId(post.id);
    try {
      await api(`/admin/posts/${post.id}`, { method: 'DELETE' });
      setPosts((list) => list.filter((p) => p.id !== post.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel panel-flush">
      <form
        className="admin-search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(queryInput.trim());
        }}
      >
        <input
          type="search"
          placeholder="Search by story or writer…"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="published">Published only</option>
          <option value="draft">Drafts only</option>
        </select>
        <button type="submit" className="btn btn-ghost">Filter</button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {!posts ? (
        <div className="state-note">Loading stories…</div>
      ) : posts.length === 0 ? (
        <p className="comments-empty">No stories match.</p>
      ) : (
        <table className="atable">
          <thead>
            <tr>
              <th>Story</th>
              <th>Writer</th>
              <th>Status</th>
              <th>Date</th>
              <th className="num">Claps</th>
              <th className="num">Resp.</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link className="atable-title" to={`/post/${p.slug}`}>{p.title}</Link>
                  <div className="atable-sub">{(p.tags || []).join(', ') || '—'}</div>
                </td>
                <td>{p.author_name}</td>
                <td><StatusPill published={p.published} /></td>
                <td>{formatDate(p.published_at || p.updated_at)}</td>
                <td className="num">{p.clap_count}</td>
                <td className="num">{p.comment_count}</td>
                <td className="num">
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-mini"
                      disabled={busyId === p.id}
                      onClick={() => setStatusFor(p, !p.published)}
                    >
                      {p.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete story"
                      disabled={busyId === p.id}
                      onClick={() => remove(p)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ---------------- writers ---------------- */

function Writers({ selfId }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    setError('');
    api(`/admin/users?q=${encodeURIComponent(query)}`)
      .then((d) => alive && setUsers(d.users))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [query]);

  const changeRole = async (u, role) => {
    setBusyId(u.id);
    setError('');
    try {
      const d = await api(`/admin/users/${u.id}/role`, { method: 'PATCH', body: { role } });
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: d.user.role } : x)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (u) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${u.name} (@${u.username}) and all their stories?`)) return;
    setBusyId(u.id);
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      setUsers((list) => list.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel panel-flush">
      <form
        className="admin-search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(queryInput.trim());
        }}
      >
        <input
          type="search"
          placeholder="Search name, username, or email…"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
        />
        <button type="submit" className="btn btn-ghost">Search</button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {!users ? (
        <div className="state-note">Loading writers…</div>
      ) : users.length === 0 ? (
        <p className="comments-empty">No writers match.</p>
      ) : (
        <table className="atable">
          <thead>
            <tr>
              <th>Writer</th>
              <th>Role</th>
              <th>Joined</th>
              <th className="num">Stories</th>
              <th className="num">Claps received</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="writer-cell">
                    <Avatar name={u.name} url={u.avatar_url} size={36} />
                    <div>
                      <Link className="atable-title" to={`/user/${u.username}`}>{u.name}</Link>
                      <div className="atable-sub">@{u.username} · {u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge${u.role === 'admin' ? ' is-admin' : ''}`}>
                    {u.role}
                  </span>
                </td>
                <td>{formatDate(u.created_at)}</td>
                <td className="num">{u.stories}</td>
                <td className="num">{u.claps_received}</td>
                <td className="num">
                  <div className="row-actions">
                    {u.id !== selfId ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-mini"
                          disabled={busyId === u.id}
                          onClick={() => changeRole(u, u.role === 'admin' ? 'writer' : 'admin')}
                        >
                          {u.role === 'admin' ? 'Set as writer' : 'Make admin'}
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete writer"
                          disabled={busyId === u.id}
                          onClick={() => remove(u)}
                        >
                          <TrashIcon />
                        </button>
                      </>
                    ) : (
                      <span className="atable-sub">That's you</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ---------------- responses ---------------- */

function Responses() {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/comments')
      .then((d) => setComments(d.comments))
      .catch((e) => setError(e.message));
  }, []);

  const remove = async (c) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this response?')) return;
    try {
      await api(`/admin/comments/${c.id}`, { method: 'DELETE' });
      setComments((list) => list.filter((x) => x.id !== c.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="panel">
      <h3>Latest responses</h3>
      {error && <p className="form-error">{error}</p>}
      {!comments ? (
        <div className="state-note">Loading responses…</div>
      ) : comments.length === 0 ? (
        <p className="comments-empty">No responses yet.</p>
      ) : (
        <ul className="res-list">
          {comments.map((c) => (
            <li key={c.id} className="res-item">
              <Avatar name={c.author_name} size={36} />
              <div className="res-body">
                <div className="comment-head">
                  <strong>{c.author_name}</strong>
                  <span className="muted">{formatDate(c.created_at)}</span>
                  <span className="dot">·</span>
                  <Link to={`/post/${c.post_slug}`} className="text-link res-story">
                    {c.post_title}
                  </Link>
                </div>
                <p>{excerptFrom(c.body, 220)}</p>
              </div>
              <button
                type="button"
                className="icon-btn danger"
                title="Delete response"
                onClick={() => remove(c)}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
