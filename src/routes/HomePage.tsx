import { useNavigate, useLocation } from 'react-router-dom';
import { HomePage as HomePageComponent } from '../components/HomePage';
import { useGame } from '../contexts/GameContext';


export const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { playerName, startTutorial } = useGame();
    const fromQuit = (location.state as { fromQuit?: boolean } | null)?.fromQuit;

    const handleSelectMode = async (mode: 'multiplayer' | 'tutorial') => {
        if (mode === 'multiplayer') {
            navigate('/multiplayer');
        } else if (mode === 'tutorial') {
            const newGameId = await startTutorial();
            if (newGameId) {
                navigate(`/game/${newGameId}`);
            }
        }
    };

    return (
      <>
        {fromQuit && (
          <div data-testid="no-refund-message" role="status" style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,107,107,0.2)', color: '#ff6b6b', marginBottom: '8px' }}>
            You will not receive a refund for forfeiting.
          </div>
        )}
        <HomePageComponent
          onSelectMode={handleSelectMode}
          playerName={playerName}
        />
      </>
    );
};
