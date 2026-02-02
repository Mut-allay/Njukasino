import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Mail, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import './AdminLoginPage.css';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmail(email, password);
      if (userCredential) {
        toast.success('Admin login successful');
        // Redirection will be handled by App.tsx logic or here
        navigate('/admin');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'admin-toast',
          style: { background: '#1a1a2e', color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)' },
        }}
      />

      <div className="admin-login-container">
        <button onClick={() => navigate('/')} className="back-link">
          <ArrowLeft size={16} />
          Back to Game
        </button>

        <div className="admin-login-card">
          <div className="login-header">
            <div className="shield-wrapper">
              <Shield size={40} className="shield-icon" />
            </div>
            <h1>Njuka Admin</h1>
            <p>Access the management console</p>
          </div>

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="form-group">
              <label htmlFor="email">Administrative Email</label>
              <div className="input-wrapper">
                <Mail size={20} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@njukasino.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Security Password</label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  Verifying...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Authorized access only. All actions are logged.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
