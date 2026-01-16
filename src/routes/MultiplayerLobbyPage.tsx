import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MultiplayerPage } from '../components/MultiplayerPage';
import { useGame } from '../contexts/GameContext';

export const MultiplayerLobbyPage = () => {
    const navigate = useNavigate();
    const {
        playerName,
        lobbies,
        loadingStates,
        createLobby,
        joinLobby,
        refreshLobbies,
        gameId,
    } = useGame();

    const [numPlayers, setNumPlayers] = useState(2);
    const [entryFee, setEntryFee] = useState(100);

    // Auto-refresh lobbies every 2 seconds
    useEffect(() => {
        refreshLobbies();
        const interval = setInterval(refreshLobbies, 2000);
        return () => clearInterval(interval);
    }, [refreshLobbies]);

    // Navigate to game when game is created/joined
    useEffect(() => {
        if (gameId) {
            navigate(`/game/${gameId}`);
        }
    }, [gameId, navigate]);

    const handleCreateLobby = async () => {
        try {
            const newLobby = await createLobby(numPlayers, entryFee);
            if (newLobby) {
                navigate(`/lobby/${newLobby.id}`);
            }
        } catch (error) {
            console.error('Failed to create lobby:', error);
        }
    };

    const handleJoinLobby = async (lobbyId: string) => {
        try {
            await joinLobby(lobbyId);
            // Navigation happens via useEffect above
        } catch (error) {
            console.error('Failed to join lobby:', error);
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    return (
        <MultiplayerPage
            onBack={handleBack}
            playerName={playerName}
            numPlayers={numPlayers}
            setNumPlayers={setNumPlayers}
            entryFee={entryFee}
            setEntryFee={setEntryFee}
            onCreateLobby={handleCreateLobby}
            onJoinLobby={handleJoinLobby}
            lobbies={lobbies}
            loadingStates={loadingStates}
            onRefreshLobbies={refreshLobbies}
        />
    );
};
