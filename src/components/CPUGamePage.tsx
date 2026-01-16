import { ArrowLeft, Bot, Coins } from 'lucide-react';
import { SelectionChips } from './SelectionChips';

interface CPUGamePageProps {
  onBack: () => void;
  numCPU: number;
  setNumCPU: (num: number) => void;
  entryFee: number;
  setEntryFee: (fee: number) => void;
  onStartGame: () => void;
  loading: boolean;
}

export const CPUGamePage = ({ 
  onBack, 
  numCPU, 
  setNumCPU,
  entryFee,
  setEntryFee,
  onStartGame,
  loading,
}: CPUGamePageProps) => {

  const cpuOptions = [
    { label: '1 Bot', value: 1, icon: <Bot size={14} /> },
    { label: '2 Bots', value: 2, icon: <Bot size={14} /> },
    { label: '3 Bots', value: 3, icon: <Bot size={14} /> },
  ];

  const feeOptions = [
    { label: 'K100', value: 100, icon: <Coins size={14} /> },
    { label: 'K500', value: 500, icon: <Coins size={14} /> },
    { label: 'K1,000', value: 1000, icon: <Coins size={16} /> },
    { label: 'K5,000', value: 5000, icon: <Coins size={18} /> },
  ];

  return (
    <div className="page-container cpu-setup-page">
      <div className="page-header">
        <div className="header-top">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back
          </button>
          <h2>Practice Mode</h2>
        </div>
      </div>

      <div className="cpu-options premium-card">
        <h3>Game Setup</h3>
        
        <SelectionChips 
          label="Opponents"
          options={cpuOptions}
          selectedValue={numCPU}
          onChange={setNumCPU}
        />

        <SelectionChips 
          label="Entry Fee"
          options={feeOptions}
          selectedValue={entryFee}
          onChange={setEntryFee}
        />

        <button
          onClick={onStartGame}
          className="start-game-btn premium-btn"
          disabled={loading}
        >
          {loading ? "Initializing..." : "Start Practice Game"}
        </button>
      </div>
    </div>
  );
};