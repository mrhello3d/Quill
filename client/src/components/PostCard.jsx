import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { formatDate, excerptFrom } from '../util/format.js';
import { ClapIcon, BubbleIcon } from './icons.jsx';

export default function PostCard({ post, featured = false }) {
  const authorHref = `/user/${post.author_username}`;
  const href = `/post/${post.slug}`;

  return (
    <article className={`post-card${featured ? ' featured' : ''}`}>
      <div className="pc-main">
        <div className="pc-author">
          <Link to={authorHref} className="pc-author-link">
            <Avatar name={post.author_name} url={post.author_avatar} size={featured ? 28 : 24} />
            <span>{post.author_name}</span>
          </Link>
          <span className="dot">·</span>
          <time dateTime={post.published_at || post.created_at}>
            {formatDate(post.published_at || post.created_at)}
          </time>
          {!post.published && <span className="draft-flag">Draft</span>}
        </div>

        <h2 className="pc-title">
          <Link to={href}>{post.title}</Link>
        </h2>

        {featured && post.subtitle ? <p className="pc-subtitle">{post.subtitle}</p> : null}

        <p className="pc-excerpt">{excerptFrom(post.preview)}</p>

        <div className="pc-meta">
          <span className="pc-read">{post.read_time} min read</span>
          <span className="pc-stat" title="Claps">
            <ClapIcon size={16} /> {post.clap_count}
          </span>
          <span className="pc-stat" title="Responses">
            <BubbleIcon size={15} /> {post.comment_count}
          </span>
          {post.tags?.length ? (
            <span className="pc-tags">
              {post.tags.slice(0, 3).map((t) => (
                <Link key={t} to={`/tag/${t}`} className="pill pill-small">
                  {t}
                </Link>
              ))}
            </span>
          ) : null}
        </div>
      </div>

      {featured && post.cover_image ? (
        <Link to={href} className="pc-thumb" tabIndex={-1} aria-hidden="true">
          <img src={post.cover_image} alt="" loading="lazy" referrerPolicy="no-referrer" />
        </Link>
      ) : null}
    </article>
  );
}
