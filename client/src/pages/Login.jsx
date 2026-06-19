import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Hardcoded users — matches what the backend seeds
const DEMO_USERS = [
  { username: 'alice', displayName: 'Alice Johnson', initials: 'AJ', color: '#6366f1' },
  { username: 'bob', displayName: 'Bob Smith', initials: 'BS', color: '#8b5cf6' },
  { username: 'charlie', displayName: 'Charlie Davis', initials: 'CD', color: '#ec4899' },
];

export default function Login() {
  const { login } = useAuth();
  const [loadingUser, setLoadingUser] = useState(null);

  const handleLogin = async (username) => {
    if (loadingUser) return; // prevent double-clicks
    setLoadingUser(username);

    try {
      await login(username);
      toast.success(`Welcome back!`);
    } catch (err) {
      toast.error(err.message || 'Login failed');
      setLoadingUser(null);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-branding">
          <span className="logo-icon" role="img" aria-label="CollabWrite logo">📝</span>
          <h1>CollabWrite</h1>
          <p className="tagline">Collaborative document editing, simplified.</p>
        </div>

        <p className="login-label">Choose a user to continue</p>

        <div className="login-users">
          {DEMO_USERS.map((user) => (
            <button
              key={user.username}
              className={`login-user-card ${loadingUser === user.username ? 'loading' : ''}`}
              onClick={() => handleLogin(user.username)}
              disabled={loadingUser !== null}
            >
              <div className="avatar" style={{ 
                background: `linear-gradient(135deg, ${user.color}20, ${user.color}30)`,
                color: user.color,
                borderColor: `${user.color}40`
              }}>
                {user.initials}
              </div>
              <div className="user-info">
                <div className="display-name">{user.displayName}</div>
                <div className="username">@{user.username}</div>
              </div>
              {loadingUser === user.username && (
                <div className="spinner" style={{ marginLeft: 'auto' }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
