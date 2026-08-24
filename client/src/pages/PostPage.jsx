import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth-context.jsx';
import Avatar from '../components/Avatar.jsx';
import { mdToHtml } from '../util/markdown.js';
import { formatDate } from '../util/format.js';
import { ClapIcon, BubbleIcon, PencilIcon, TrashIcon } from '../components/icons.jsx';

export default function PostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const [clapped, setClapped] = useState(false);
  const [clapCount, setClapCount] = useState(0);
  const [popping, setPopping] = useState(false);
  const popTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api(`/posts/slug/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!alive) return;
        setPost(d.post);
        setClapped(d.post.clapped_by_me);
        setClapCount(d.post.clap_count);
        setStatus('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setStatus('missing');
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => () => clearTimeout(popTimer.current), []);

  const html = useMemo(() => (post ? mdToHtml(post.content) : ''), [post]);

  if (status === 'loading') return <div className="state-note">Loading story…</div>;
  if (status === 'missing') {
    return (
      <div className="state-page">
        <h1 className="serif">Story not found.</h1>
        <p>{error}</p>
        <Link to="/" className="btn btn-primary">Back to the feed</Link>
      </div>
    );
  }

  const isOwner = user && user.id === post.author_id;

  const clap = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/post/${post.slug}` } });
      return;
    }
    const optimistic = !clapped;
    setClapped(optimistic);
    setClapCount((c) => c + (optimistic ? 1 : -1));
    setPopping(true);
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPopping(false), 260);
    try {
      const d = await api(`/posts/${post.id}/clap`, { method: 'POST' });
      setClapped(d.clapped);
      setClapCount(d.count);
    } catch {
      setClapped(!optimistic);
      setClapCount((c) => c + (optimistic ? -1 : 1));
    }
  };

  const removePost = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this story? This cannot be undone.')) return;
    try {
      await api(`/posts/${post.id}`, { method: 'DELETE' });
      navigate(`/user/${user.username}`);
    } catch (e) {
      alert(e.message); // eslint-disable-line no-alert
    }
  };

  return (
    <article className="article">
      <header className="article-head">
        {post.tags?.length ? (
          <div className="article-tags">
            {post.tags.slice(0, 3).map((t) => (
              <Link key={t} to={`/tag/${t}`} className="pill pill-small">{t}</Link>
            ))}
          </div>
        ) : null}

        <h1 className="serif">{post.title}</h1>
        {post.subtitle ? <p className="article-subtitle serif">{post.subtitle}</p> : null}

        {!post.published && <p className="draft-banner">Draft — only you can see this story.</p>}

        <div className="byline">
          <Link to={`/user/${post.author_username}`} className="byline-id">
            <Avatar name={post.author_name} url={post.author_avatar} size={44} />
            <span>
              <strong>{post.author_name}</strong>
              <span className="muted">
                {formatDate(post.published_at || post.created_at)} · {post.read_time} min read
              </span>
            </span>
          </Link>

          {isOwner && (
            <div className="owner-actions">
              <Link className="icon-btn" to={`/write/${post.slug}`} title="Edit story">
                <PencilIcon /> Edit
              </Link>
              <button type="button" className="icon-btn danger" onClick={removePost} title="Delete story">
                <TrashIcon /> Delete
              </button>
            </div>
          )}
        </div>

        <div className="rule-double" />
      </header>

      <div className="article-body serif" dangerouslySetInnerHTML={{ __html: html }} />

      <Comments post={post} />

      <div className="action-bar" role="toolbar" aria-label="Story actions">
        <button
          type="button"
          className={`clap${clapped ? ' clapped' : ''}${popping ? ' popping' : ''}`}
          onClick={clap}
          aria-pressed={clapped}
          title={user ? (clapped ? 'Remove clap' : 'Clap for this story') : 'Sign in to clap'}
        >
          <ClapIcon size={22} />
          <span>{clapCount}</span>
        </button>
        <a
          href="#comments"
          className="clap"
          title="Jump to responses"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <BubbleIcon size={19} />
          <span>{post.comment_count}</span>
        </a>
      </div>
    </article>
  );
}

function Comments({ post }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api(`/posts/${post.id}/comments`)
      .then((d) => alive && setComments(d.comments))
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [post.id]);

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      const d = await api(`/posts/${post.id}/comments`, { method: 'POST', body: { body: text } });
      setComments((c) => [...c, d.comment]);
      setBody('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api(`/comments/${id}`, { method: 'DELETE' });
      setComments((c) => c.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section id="comments" className="comments">
      <h2 className="comments-title">Responses <span>({comments.length})</span></h2>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <Avatar name={user.name} url={user.avatar_url} size={36} />
          <textarea
            rows={2}
            placeholder="What are your thoughts?"
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(e);
            }}
          />
          <button className="btn btn-primary" disabled={busy || !body.trim()}>
            {busy ? 'Sending…' : 'Respond'}
          </button>
        </form>
      ) : (
        <div className="comment-cta">
          <p>Sign in to join the conversation.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {loaded && comments.length === 0 ? (
        <p className="comments-empty">No responses yet. Start the conversation.</p>
      ) : null}

      <ul className="comment-list">
        {comments.map((c) => (
          <li key={c.id} className="comment">
            <Avatar name={c.user.name} url={c.user.avatar_url} size={36} />
            <div className="comment-body">
              <div className="comment-head">
                <Link to={`/user/${c.user.username}`}>{c.user.name}</Link>
                <span className="muted">{formatDate(c.created_at)}</span>
                {c.mine && (
                  <button type="button" className="icon-btn danger comment-del" onClick={() => remove(c.id)}>
                    <TrashIcon /> Delete
                  </button>
                )}
              </div>
              <p>{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
