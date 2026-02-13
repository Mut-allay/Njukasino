import { useNavigate } from 'react-router-dom';
import { HomePage as HomePageComponent } from '../components/HomePage';
import { useGame } from '../contexts/GameContext';


export const HomePage = () => {
    const navigate = useNavigate();
    const { playerName, startTutorial } = useGame();

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

    return <HomePageComponent
        onSelectMode={handleSelectMode}
        playerName={playerName}
    />;
};
