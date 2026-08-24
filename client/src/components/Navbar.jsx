import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context.jsx';
import Avatar from './Avatar.jsx';
import { PencilIcon, SearchIcon } from './icons.jsx';

function closeMenu(e) {
  const details = e.currentTarget.closest('details');
  if (details) details.removeAttribute('open');
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/');
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="logo" aria-label="Quill home">
          Quill<span className="logo-dot">.</span>
        </Link>

        <form className="nav-search" onSubmit={submitSearch} role="search">
          <span className="nav-search-icon"><SearchIcon /></span>
          <input
            type="search"
            placeholder="Search stories"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search stories"
          />
        </form>

        <nav className="nav-actions">
          {user ? (
            <>
              <Link to="/write" className="btn btn-ghost nav-write">
                <PencilIcon /> Write
              </Link>
              <details className="menu">
                <summary aria-label="Account menu">
                  <Avatar name={user.name} url={user.avatar_url} size={34} />
                </summary>
                <div className="menu-pop">
                  <div className="menu-head">
                    <strong>{user.name}</strong>
                    <span>
                      @{user.username}
                      {user.role === 'admin' ? ' · admin' : ''}
                    </span>
                  </div>
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={closeMenu}>Admin dashboard</Link>
                  )}
                  <Link to={`/user/${user.username}`} onClick={closeMenu}>Profile</Link>
                  <Link to="/?mine=true" onClick={closeMenu}>Your stories</Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      closeMenu(e);
                      logout();
                      navigate('/');
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign in</Link>
              <Link to="/signup" className="btn btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
