import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, User, Wallet, Phone, AtSign } from 'lucide-react';
import './ProfilePage.css';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const fullName = [userData?.firstName, userData?.lastName]
    .filter(Boolean)
    .join(' ') || 'N/A';

  const maskedPhone = userData?.phone
    ? userData.phone.replace(/(\d{3})\d+(\d{3})/, '$1***$2')
    : 'N/A';

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <button onClick={() => navigate(-1)} className="profile-back-button">
            <ArrowLeft size={18} />
            Back
          </button>
          <h1 className="profile-title">
            <User size={24} />
            Profile
          </h1>
          <div style={{ width: '60px' }}></div>
        </div>

        <div className="profile-avatar">
          <div className="avatar-circle">
            <User size={48} />
          </div>
          <h2 className="profile-username">@{userData?.username || 'unknown'}</h2>
        </div>

        <div className="profile-fields">
          <div className="profile-field">
            <div className="field-icon"><User size={18} /></div>
            <div className="field-content">
              <span className="field-label">Full Name</span>
              <span className="field-value">{fullName}</span>
            </div>
          </div>

          <div className="profile-field">
            <div className="field-icon"><AtSign size={18} /></div>
            <div className="field-content">
              <span className="field-label">Username</span>
              <span className="field-value">{userData?.username || 'N/A'}</span>
            </div>
          </div>

          <div className="profile-field">
            <div className="field-icon"><Wallet size={18} /></div>
            <div className="field-content">
              <span className="field-label">Wallet Balance</span>
              <span className="field-value wallet-value">
                K{Number(userData?.wallet_balance ?? userData?.wallet ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="profile-field">
            <div className="field-icon"><Phone size={18} /></div>
            <div className="field-content">
              <span className="field-label">Phone Number</span>
              <span className="field-value">{maskedPhone}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
