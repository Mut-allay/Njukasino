import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Info, Home, Volume2, VolumeX, BookOpen, X, GraduationCap, Menu, ChevronDown, User } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { hapticFeedback } from '../utils/haptics';

interface EnhancedBottomMenuProps {
  soundsEnabled: boolean;
  toggleSounds: () => void;
  playSound: (soundType: 'button') => void;
}

export const EnhancedBottomMenu = ({
  soundsEnabled,
  toggleSounds,
  playSound,
}: EnhancedBottomMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameState, quitGame } = useGame();
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(true);

  // Check if we're in an active game session
  const isInGame = location.pathname.startsWith('/game/') || location.pathname.startsWith('/lobby/');
  const showQuitButton = isInGame && (gameState || location.pathname.includes('lobby'));

  const handleAction = (action: () => void, intensity: 'light' | 'medium' = 'light') => {
    hapticFeedback(intensity);
    playSound('button');
    action();
  };

  const toggleSettings = () => {
    handleAction(() => {
      setSettingsExpanded(!settingsExpanded);
      setInfoExpanded(false);
    });
  };

  const toggleInfo = () => {
    handleAction(() => {
      setInfoExpanded(!infoExpanded);
      setSettingsExpanded(false);
    });
  };

  const handleNav = (path: string) => {
    if (location.pathname === path) return;
    handleAction(() => navigate(path));
  };

  const toggleMenu = () => {
    handleAction(() => setMenuCollapsed(!menuCollapsed));
  };

  const handleQuit = () => {
    handleAction(() => {
      quitGame();
      navigate('/');
    }, 'medium');
  };

  // Close menus on page change
  useEffect(() => {
    setSettingsExpanded(false);
    setInfoExpanded(false);
  }, [location.pathname]);

  return (
    <div className={`enhanced-bottom-menu ${isInGame ? 'in-game' : ''} ${menuCollapsed ? 'collapsed' : ''}`}>
      {/* Expandable Settings Panel */}
      {settingsExpanded && !menuCollapsed && (
        <div className="expanded-panel settings-panel">
          <div className="panel-header">
            <span>Settings</span>
            <button onClick={toggleSettings} className="close-panel"><X size={18} /></button>
          </div>
          <button 
            onClick={() => handleAction(toggleSounds)}
            className="panel-item"
          >
            <div className={`icon-circle ${soundsEnabled ? 'active' : ''}`}>
              {soundsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </div>
            <span>Game Sounds: {soundsEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}

      {/* Expandable Info Panel */}
      {infoExpanded && !menuCollapsed && (
        <div className="expanded-panel info-panel">
          <div className="panel-header">
            <span>Information</span>
            <button onClick={toggleInfo} className="close-panel"><X size={18} /></button>
          </div>
          <button 
            onClick={() => handleNav('/rules')}
            className="panel-item"
          >
            <div className="icon-circle">
              <BookOpen size={18} />
            </div>
            <span>Rules & How to Play</span>
          </button>
          <button 
            onClick={() => {
              if (isInGame) {
                // If in game, maybe just show a tip? 
                // For now, let's just allow starting tutorial if they want
                handleAction(() => {
                  toggleInfo();
                  navigate('/');
                });
              } else {
                // We need playerName to start tutorial from here too
                // For now, let's just navigate to home where the card is
                handleNav('/');
              }
            }}
            className="panel-item highlight-item"
          >
            <div className="icon-circle tutorial-icon">
              <GraduationCap size={18} />
            </div>
            <span>Interactive Tutorial</span>
          </button>
        </div>
      )}

      {/* Hamburger Button - shown when collapsed */}
      {menuCollapsed && (
        <button 
          onClick={toggleMenu}
          className="hamburger-button"
          aria-label="Expand menu"
        >
          <Menu size={24} strokeWidth={2.5} />
          <span>Menu</span>
        </button>
      )}

      {/* Main Menu Bar - hidden when collapsed */}
      {!menuCollapsed && (
        <div className="main-menu-bar">
          <button
            onClick={() => handleNav('/')}
            className="menu-tab"
          >
            <Home size={22} />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleNav('/profile')}
            className="menu-tab"
          >
            <User size={22} />
            <span>Profile</span>
          </button>

          <button
            onClick={toggleSettings}
            className={`menu-tab ${settingsExpanded ? 'active' : ''}`}
          >
            <Settings size={22} />
            <span>Settings</span>
          </button>

          <button 
            onClick={toggleInfo}
            className={`menu-tab ${infoExpanded ? 'active' : ''}`}
          >
            <Info size={22} />
            <span>Help</span>
          </button>

          {showQuitButton && (
            <button 
              onClick={handleQuit}
              className="menu-tab quit-tab"
            >
              <div className="quit-icon-wrapper">
                <X size={20} />
              </div>
              <span>Quit</span>
            </button>
          )}

          {/* Collapse Button - appears on the right side */}
          <button 
            onClick={toggleMenu}
            className="menu-tab collapse-tab"
            aria-label="Collapse menu"
          >
            <ChevronDown size={22} />
            <span>Hide</span>
          </button>
        </div>
      )}
    </div>
  );
};
