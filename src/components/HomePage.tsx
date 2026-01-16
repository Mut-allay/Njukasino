import { Users, Bot, Zap, GraduationCap } from 'lucide-react';
import { hapticFeedback } from '../utils/haptics';

interface HomePageProps {
  onSelectMode: (mode: 'multiplayer' | 'cpu' | 'tutorial') => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}

export const HomePage = ({ onSelectMode, playerName, setPlayerName }: HomePageProps) => {
  const handleModeSelection = (mode: 'multiplayer' | 'cpu' | 'tutorial') => {
    hapticFeedback('medium');
    onSelectMode(mode);
  };

  return (
    <div className="page-container home-page">
      <div className="welcome-section">
        <div className="header-top">
          <h2>Welcome to Njuka King!</h2>
        </div>
        <div className="live-indicator">
          <span className="dot"></span>
          <span>124 Players Online</span>
        </div>
      </div>
      
      <div className="new-game-form">
        <div className="input-group">
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
              const name = e.target.value;
              if (name.length <= 20) {
                setPlayerName(name);
              }
            }}
            placeholder="Enter your name (2-20 chars)"
            maxLength={20}
            required
            className="premium-input"
          />
        </div>
        
        
        <div className="game-cards">
          <button
            className="game-card tutorial-card"
            onClick={() => handleModeSelection('tutorial')}
            disabled={!playerName.trim()}
          >
            <div className="card-content">
              <div className="icon-box">
                <GraduationCap size={40} />
              </div>
              <div className="text-box">
                <div className="title-row">
                  <h3>Play Tutorial</h3>
                  <span className="premium-badge">NEW</span>
                </div>
                <p>Learn the basics step-by-step</p>
              </div>
              <div className="go-icon">
                <Zap size={20} />
              </div>
            </div>
            <div className="card-decoration"></div>
          </button>

          <button
            className="game-card multiplayer-card"
            onClick={() => handleModeSelection('multiplayer')}
            disabled={!playerName.trim()}
          >
            <div className="card-content">
              <div className="icon-box">
                <Users size={40} />
              </div>
              <div className="text-box">
                <h3>Multiplayer</h3>
                <p>Play with friends online</p>
              </div>
              <div className="go-icon">
                <Zap size={20} />
              </div>
            </div>
            <div className="card-decoration"></div>
          </button>
          
          <button
            className="game-card cpu-card"
            onClick={() => handleModeSelection('cpu')}
            disabled={!playerName.trim()}
          >
            <div className="card-content">
              <div className="icon-box">
                <Bot size={40} />
              </div>
              <div className="text-box">
                <h3>Practice vs CPU</h3>
                <p>Sharpen your skills</p>
              </div>
              <div className="go-icon">
                <Zap size={20} />
              </div>
            </div>
            <div className="card-decoration"></div>
          </button>
        </div>
      </div>
    </div>
  );
};
