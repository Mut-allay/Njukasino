import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { createAdminApi } from '../services/adminApi';
import { Shield, TrendingUp, Users, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import './AdminDashboard.css';

export const AdminDashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [houseBalance, setHouseBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const adminApi = useMemo(() => {
    const getToken = async () => {
      const user = auth.currentUser;
      if (!user) return null;
      return user.getIdToken();
    };
    return createAdminApi(getToken);
  }, []);

  const fetchHouseBalance = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await adminApi.getHouseBalance();
      setHouseBalance(res.house_balance);
      if (quiet) toast.success('Balance updated');
    } catch (error) {
      console.error('Error fetching house balance:', error);
      toast.error('Failed to load house balance');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [adminApi]);

  useEffect(() => {
    if (!userData?.is_admin) {
      // Security check: if not admin, redirect home
      // Note: Backend also protects the data
      navigate('/');
      return;
    }
    fetchHouseBalance();
  }, [userData, navigate, fetchHouseBalance]);

  if (!userData?.is_admin) return null;

  return (
    <div className="admin-dashboard">
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'admin-toast',
          style: { background: '#1a1a2e', color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)' },
        }}
      />

      <div className="admin-container">
        <header className="admin-header">
          <button onClick={() => navigate('/home')} className="back-button">
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="admin-title-group">
            <Shield className="admin-icon" size={28} />
            <h1>Admin Dashboard</h1>
          </div>
          <button 
            onClick={() => fetchHouseBalance(true)} 
            className={`refresh-button ${isRefreshing ? 'spinning' : ''}`}
            disabled={isRefreshing}
          >
            <RefreshCw size={18} />
          </button>
        </header>

        <section className="admin-stats-grid">
          <div className="admin-stat-card house-balance">
            <div className="stat-header">
              <TrendingUp size={20} className="stat-icon" />
              <span>House Earnings</span>
            </div>
            {loading ? (
              <Loader2 size={32} className="stat-spinner" />
            ) : (
              <div className="stat-value">
                <span className="currency">K</span>
                <span className="amount">{houseBalance?.toLocaleString() ?? '0'}</span>
              </div>
            )}
            <div className="stat-footer">
              10% cut of all winning pots
            </div>
          </div>

          <div className="admin-stat-card players-online">
            <div className="stat-header">
              <Users size={20} className="stat-icon" />
              <span>Platform Status</span>
            </div>
            <div className="stat-value secondary">
              <span className="status-indicator"></span>
              Live
            </div>
            <div className="stat-footer">
              Backend is operational
            </div>
          </div>
        </section>

        <section className="admin-main-content">
          <div className="admin-notice">
            <h2>Management Console</h2>
            <p>Welcome, {userData?.firstName || 'Admin'}. You are viewing the house's financial overview.</p>
            <div className="admin-actions">
               {/* Future actions like withdrawal, user management, etc. */}
               <button className="admin-action-btn disabled">View Transactions (Coming Soon)</button>
               <button className="admin-action-btn disabled">Adjust House Cut (Coming Soon)</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
