import { Routes, Route, Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import PostPage from './pages/PostPage.jsx';
import Editor from './pages/Editor.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Admin from './pages/Admin.jsx';
import { useAuth } from './auth-context.jsx';

function Layout() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="state-note">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="state-note">Loading…</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="state-page">
      <h1 className="serif">Nothing on this page.</h1>
      <p>It may have been moved, or it never existed.</p>
      <Link className="btn btn-primary" to="/">Back to the feed</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tag/:tag" element={<Home />} />
        <Route path="/post/:slug" element={<PostPage />} />
        <Route path="/user/:username" element={<Profile />} />
        <Route
          path="/write"
          element={
            <RequireAuth>
              <Editor />
            </RequireAuth>
          }
        />
        <Route
          path="/write/:slug"
          element={
            <RequireAuth>
              <Editor />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
