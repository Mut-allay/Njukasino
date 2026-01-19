import { useAuth } from '../contexts/AuthContext';
import { Wallet, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './WalletDisplay.css';

export const WalletDisplay = () => {
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser || !userData?.onboarded) {
    return null;
  }

  const wallet = userData.wallet ?? 0;

  return (
    <div className="wallet-display">
      <div className="wallet-info">
        <Wallet size={20} />
        <div className="wallet-details">
          <span className="wallet-label">Wallet</span>
          <span className="wallet-amount">K{wallet.toLocaleString()}</span>
        </div>
      </div>
      {wallet < 10000 && (
        <button 
          className="deposit-btn-small"
          onClick={() => navigate('/deposit')}
          title="Add funds"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
};
