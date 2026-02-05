import React from 'react';
import { AlertCircle, PlusCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InsufficientFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount: number;
  currentBalance: number;
}

const InsufficientFundsModal: React.FC<InsufficientFundsModalProps> = ({
  isOpen,
  onClose,
  requiredAmount,
  currentBalance
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleTopUp = () => {
    onClose();
    navigate('/wallet');
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1a1a] border-2 border-red-500/50 rounded-3xl p-8 w-full max-w-sm relative shadow-2xl shadow-red-500/10">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <X size={20} className="text-white/40" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} className="text-red-500" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">Insufficient Funds</h3>
          
          <div className="bg-white/5 rounded-2xl p-4 w-full mb-6 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/40 text-sm">Required Fee</span>
              <span className="text-white font-bold">K{requiredAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-sm">Your Balance</span>
              <span className="text-red-400 font-bold">K{currentBalance.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-white/60 text-sm mb-8 leading-relaxed">
            You don't have enough balance to join this game. Please top up your wallet to continue.
          </p>

          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleTopUp}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
            >
              <PlusCircle size={20} />
              Top Up Now
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-white/5 text-white/60 font-medium py-3 rounded-xl hover:bg-white/10 transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsufficientFundsModal;
