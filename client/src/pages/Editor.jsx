import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth-context.jsx';

export default function Editor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState('');
  const [tagsText, setTagsText] = useState('');

  const [postId, setPostId] = useState(null);
  const [wasPublished, setWasPublished] = useState(false);
  const [loading, setLoading] = useState(Boolean(slug));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!slug) return undefined;
    let alive = true;
    api(`/posts/slug/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!alive) return;
        if (d.post.author_id !== user.id) {
          navigate(`/post/${d.post.slug}`, { replace: true });
          return;
        }
        setTitle(d.post.title);
        setSubtitle(d.post.subtitle || '');
        setContent(d.post.content);
        setCover(d.post.cover_image || '');
        setTagsText((d.post.tags || []).join(', '));
        setPostId(d.post.id);
        setWasPublished(d.post.published);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug, user.id, navigate]);

  const tags = tagsText
    .split(',')
    .map((t) => t.trim().replace(/^#+/, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  const save = async (publish) => {
    setError('');
    if (!title.trim()) return setError('Give your story a title first.');
    if (!content.trim()) return setError('The page is still blank - write something first.');

    setBusy(true);
    setNote('');
    try {
      const payload = {
        title,
        subtitle,
        content,
        cover_image: cover,
        tags,
        published: publish,
      };
      const d = postId
        ? await api(`/posts/${postId}`, { method: 'PUT', body: payload })
        : await api('/posts', { method: 'POST', body: payload });

      if (publish) {
        navigate(`/post/${d.post.slug}`);
      } else {
        setPostId(d.post.id);
        setNote(wasPublished ? 'Draft saved. The published version is unchanged.' : 'Draft saved.');
        if (!slug) {
          // keep edits in the same document going forward
          window.history.replaceState(null, '', `/write/${d.post.slug}`);
        }
        setWasPublished(false);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="state-note">Opening your draft…</div>;

  return (
    <div className="editor">
      <input
        className="editor-title serif"
        placeholder="Title"
        value={title}
        maxLength={150}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={!slug}
      />
      <input
        className="editor-subtitle serif"
        placeholder="Add a subtitle"
        value={subtitle}
        maxLength={200}
        onChange={(e) => setSubtitle(e.target.value)}
      />

      <div className="editor-cover">
        <label>
          <span aria-hidden="true">🖼</span>
          <input
            type="url"
            placeholder="Cover image URL (optional)"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
          />
        </label>
        {cover ? (
          <img src={cover} alt="Cover preview" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : null}
      </div>

      <textarea
        className="editor-content serif"
        placeholder="Tell your story…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
      />

      <div className="editor-help">
        Markdown works here: <code># Heading</code>, <code>**bold**</code>, <code>*italic*</code>,{' '}
        <code>&gt; quote</code>, <code>- list</code>, <code>[link](https://…)</code>
      </div>

      <div className="editor-tags">
        <input
          type="text"
          placeholder="Add up to 5 topics, comma separated"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
        />
        {tags.length > 0 && (
          <div className="pill-cloud">
            {tags.map((t) => (
              <span key={t} className="pill">{t}</span>
            ))}
          </div>
        )}
      </div>

      {(error || note) && (
        <p className={error ? 'form-error' : 'form-note'}>{error || note}</p>
      )}

      <footer className="editor-bar">
        <Link to="/" className="text-link">Close</Link>
        <div className="editor-bar-actions">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(false)}>
            Save draft
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(true)}>
            {wasPublished ? 'Update story' : 'Publish'}
          </button>
        </div>
      </footer>
    </div>
  );
}
