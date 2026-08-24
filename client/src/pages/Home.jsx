import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth-context.jsx';
import PostCard from '../components/PostCard.jsx';

const PAGE_SIZE = 10;

export default function Home() {
  const { tag } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();

  const q = params.get('q') || '';
  const sort = params.get('sort') === 'top' ? 'top' : 'new';
  const mine = params.get('mine') === 'true' && !!user;

  const [posts, setPosts] = useState([]);
  const [nextOffset, setNextOffset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [topics, setTopics] = useState([]);

  useEffect(() => {
    api('/posts/tags/top')
      .then((d) => setTopics(d.tags))
      .catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    const qs = new URLSearchParams();
    if (tag) qs.set('tag', tag);
    if (q) qs.set('q', q);
    if (sort !== 'new') qs.set('sort', sort);
    if (mine) qs.set('mine', 'true');
    qs.set('limit', String(PAGE_SIZE));

    api(`/posts?${qs.toString()}`)
      .then((d) => {
        if (!alive) return;
        setPosts(d.posts);
        setNextOffset(d.nextOffset);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [tag, q, sort, mine]);

  const loadMore = async () => {
    if (!nextOffset) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams();
      if (tag) qs.set('tag', tag);
      if (q) qs.set('q', q);
      if (sort !== 'new') qs.set('sort', sort);
      if (mine) qs.set('mine', 'true');
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(nextOffset));
      const d = await api(`/posts?${qs.toString()}`);
      setPosts((p) => [...p, ...d.posts]);
      setNextOffset(d.nextOffset);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const setSort = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'top') next.set('sort', 'top');
    else next.delete('sort');
    setParams(next, { replace: true });
  };

  const heading = tag
    ? `#${tag}`
    : mine
      ? 'Your stories'
      : null;

  return (
    <div className="home">
      <div className="feed-col">
        <header className={`feed-head${heading || q ? '' : ' feed-head-tall'}`}>
          {heading || q ? (
            <>
              <h1 className="serif">{q ? `“${q}”` : heading}</h1>
              <p className="feed-sub">
                {q ? 'Stories matching your search.' : mine ? 'Everything you have written, including drafts.' : `Stories tagged ${heading}.`}
                {' '}
                {(tag || q || mine) && (
                  <Link to="/" className="text-link">Clear</Link>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Stories worth your time</p>
              <h1 className="serif">Human sense, in short essays.</h1>
            </>
          )}

          {!mine && (
            <div className="seg" role="tablist" aria-label="Sort stories">
              <button
                type="button"
                className={sort === 'new' ? 'on' : ''}
                onClick={() => setSort('new')}
              >
                Latest
              </button>
              <button
                type="button"
                className={sort === 'top' ? 'on' : ''}
                onClick={() => setSort('top')}
              >
                Most clapped
              </button>
            </div>
          )}
          <div className="rule-double" />
        </header>

        {loading ? (
          <div className="skeleton-list" aria-label="Loading stories">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel-card">
                <span className="skel skel-line w40" />
                <span className="skel skel-title" />
                <span className="skel skel-line w80" />
                <span className="skel skel-line w60" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="state-note">
            <p>{error}</p>
            <Link to="/" className="text-link">Back to the feed</Link>
          </div>
        ) : posts.length === 0 ? (
          <div className="state-note">
            <h2 className="serif">Nothing here yet.</h2>
            <p>
              {mine
                ? 'Your draft drawer is empty.'
                : 'Be the first to write something for this corner of Quill.'}
            </p>
            <Link to="/write" className="btn btn-primary">Start writing</Link>
          </div>
        ) : (
          <>
            <div className="feed-list">
              {posts.map((p, i) => (
                <PostCard key={p.id} post={p} featured={i === 0} />
              ))}
            </div>

            {nextOffset !== null ? (
              <button type="button" className="btn btn-ghost load-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Show more'}
              </button>
            ) : (
              posts.length > 3 && <p className="end-note">You are all caught up.</p>
            )}
          </>
        )}
      </div>

      <aside className="rail">
        <div className="rail-box sticky-rail">
          <h3>Topics</h3>
          <div className="pill-cloud">
            {topics.length ? (
              topics.map((t) => (
                <Link
                  key={t.tag}
                  to={`/tag/${t.tag}`}
                  className={`pill${tag === t.tag ? ' pill-on' : ''}`}
                >
                  {t.tag} <em>{t.count}</em>
                </Link>
              ))
            ) : (
              <p className="rail-hint">Topics appear as stories are published.</p>
            )}
          </div>
          <div className="rail-foot">
            <p>Quill · a microblog for people who write</p>
            <p>Built with React + Neon Postgres</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
