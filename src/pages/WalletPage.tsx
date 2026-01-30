import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { createWalletApi } from '../services/walletApi';
import { WalletDepositForm } from '../components/WalletDepositForm';
import { WalletWithdrawForm } from '../components/WalletWithdrawForm';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import './WalletPage.css';

type Tab = 'deposit' | 'withdraw';

export const WalletPage = () => {
  const { currentUser, userData } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('deposit');

  const walletApi = useMemo(() => {
    const getToken = async () => {
      const user = auth.currentUser;
      if (!user) return null;
      return user.getIdToken();
    };
    return createWalletApi(getToken);
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!currentUser) return;
    setLoadingBalance(true);
    try {
      const res = await walletApi.getBalance();
      setBalance(res.wallet_balance);
    } catch {
      const fallback = userData?.wallet_balance ?? (userData as { wallet?: number })?.wallet ?? 0;
      setBalance(typeof fallback === 'number' ? fallback : 0);
      toast.error('Could not load balance');
    } finally {
      setLoadingBalance(false);
    }
  }, [currentUser, walletApi, userData]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Realtime balance listener
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newBalance = data?.wallet_balance ?? 0;
        setBalance(newBalance);
      }
    }, (error) => {
      console.error('Error listening to balance updates:', error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const displayBalance = balance ?? (userData?.wallet_balance ?? (userData as { wallet?: number })?.wallet ?? 0);
  const defaultPhone = currentUser?.phoneNumber ?? (userData as { phone?: string })?.phone ?? '';

  const handleDepositMomo = (body: { amount: number; phone: string }) => walletApi.depositMomo(body);
  const handleDepositCard = (body: {
    amount: number;
    card_details: { card_number: string; expiry_month: string; expiry_year: string; cvv: string };
  }) => walletApi.depositCard(body);
  const handleWithdraw = (body: { amount: number; phone: string }) => walletApi.withdrawMomo(body);

  return (
    <div className="wallet-page">
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'wallet-toast',
          style: { background: '#1a1a2e', color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)' },
        }}
      />

      <div className="wallet-page-card">
        <h1 className="wallet-page-title">
          <Wallet size={28} />
          Wallet
        </h1>

        <div className="wallet-balance-box">
          <span className="wallet-balance-label">Available balance</span>
          {loadingBalance ? (
            <Loader2 size={32} className="wallet-spinner" />
          ) : (
            <span className="wallet-balance-amount">K{Number(displayBalance).toLocaleString()}</span>
          )}
        </div>

        <div className="wallet-tabs">
          <button
            type="button"
            className={`wallet-tab-btn ${tab === 'deposit' ? 'active' : ''}`}
            onClick={() => setTab('deposit')}
          >
            <ArrowDownCircle size={20} />
            Deposit
          </button>
          <button
            type="button"
            className={`wallet-tab-btn ${tab === 'withdraw' ? 'active' : ''}`}
            onClick={() => setTab('withdraw')}
          >
            <ArrowUpCircle size={20} />
            Withdraw
          </button>
        </div>

        {tab === 'deposit' && (
          <WalletDepositForm
            defaultPhone={defaultPhone}
            onDepositMomo={handleDepositMomo}
            onDepositCard={handleDepositCard}
            loading={loading}
            setLoading={setLoading}
            onSuccess={(msg) => {
              toast.success(msg);
              fetchBalance();
            }}
            onError={(msg) => toast.error(msg)}
          />
        )}

        {tab === 'withdraw' && (
          <WalletWithdrawForm
            balance={typeof displayBalance === 'number' ? displayBalance : 0}
            defaultPhone={defaultPhone}
            onWithdraw={handleWithdraw}
            loading={loading}
            setLoading={setLoading}
            onSuccess={(msg) => {
              toast.success(msg);
              fetchBalance();
            }}
            onError={(msg) => toast.error(msg)}
          />
        )}
      </div>
    </div>
  );
};
