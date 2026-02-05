import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MultiplayerPage } from '../components/MultiplayerPage';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import InsufficientFundsModal from '../components/InsufficientFundsModal';

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
        lobby,
    } = useGame();
    const { userData } = useAuth();

    const [numPlayers, setNumPlayers] = useState(2);
    const [entryFee, setEntryFee] = useState(100);
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [requiredFee, setRequiredFee] = useState(0);

    // Auto-refresh lobbies every 2 seconds
    useEffect(() => {
        refreshLobbies();
        const interval = setInterval(refreshLobbies, 2000);
        return () => clearInterval(interval);
    }, [refreshLobbies]);

    // Navigate to game when game is created/joined or lobby starts
    useEffect(() => {
        if (gameId) {
            console.log(`[MultiplayerLobby] Game ID detected: ${gameId}. Navigating...`);
            navigate(`/game/${gameId}`, { replace: true });
        } else if (lobby?.started && lobby?.game_id) {
            console.log(`[MultiplayerLobby] Lobby started detected. Navigating to game...`);
            navigate(`/game/${lobby.game_id}`, { replace: true });
        }
    }, [gameId, lobby?.started, lobby?.game_id, navigate]);

    const handleCreateLobby = async () => {
        const balance = userData?.wallet_balance || 0;
        if (balance < entryFee) {
            setRequiredFee(entryFee);
            setIsBalanceModalOpen(true);
            return;
        }

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
        const targetLobby = lobbies.find(l => l.id === lobbyId);
        const fee = targetLobby?.entry_fee || 0;
        const balance = userData?.wallet_balance || 0;

        if (balance < fee) {
            setRequiredFee(fee);
            setIsBalanceModalOpen(true);
            return;
        }

        try {
            await joinLobby(lobbyId);
            // If already started, navigate immediately
            if (targetLobby?.started && targetLobby?.game_id) {
                navigate(`/game/${targetLobby.game_id}`);
            } else {
                navigate(`/lobby/${lobbyId}`);
            }
        } catch (error) {
            console.error('Failed to join lobby:', error);
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    return (
        <>
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

            <InsufficientFundsModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                currentBalance={userData?.wallet_balance || 0}
                requiredAmount={requiredFee}
            />
        </>
    );
};
