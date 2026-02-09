import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import LazyGameTable from '../components/LazyGameTable';
import LazyGameOverModal from '../components/LazyGameOverModal';
import ErrorModal from '../components/ErrorModal';
import InsufficientFundsModal from '../components/InsufficientFundsModal';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../contexts/AuthContext';

interface GameRoomPageProps {
    playSound: (soundType: 'draw' | 'discard' | 'win' | 'button' | 'shuffle') => void;
}

export const GameRoomPage = ({ playSound }: GameRoomPageProps) => {
    const navigate = useNavigate();
    const { lobbyId, gameId: urlGameId } = useParams();
    const {
        gameState,
        playerName,
        lobby,
        gameId,
        loadingStates,
        error,
        setError,
        gameWS,
        drawCard,
        discardCard,
        quitGame,
        cancelLobby,
        quitLobby,
        startLobby,
    } = useGame();
    const { currentUser, userData } = useAuth();

    // Track if we are in the process of quitting to prevent re-sync
    const isQuittingRef = useRef(false);

    const [exitedPlayer, setExitedPlayer] = useState<string | null>(null);

    // Navigate to game URL as soon as we have started lobby + gameId (so all clients leave waiting overlay)
    useEffect(() => {
        if (isQuittingRef.current) return;
        const targetGameId = gameId || lobby?.game_id;
        if (lobbyId && !urlGameId && lobby?.started && targetGameId) {
            console.log(`[GameRoom] Lobby started — navigating to game: ${targetGameId}`);
            navigate(`/game/${targetGameId}`, { replace: true });
        }
    }, [lobbyId, urlGameId, lobby?.started, lobby?.game_id, gameId, navigate]);


    // Handle "Player Exited" WebSocket messages
    useEffect(() => {
        if (!gameWS) return;
        
        const originalOnMessage = gameWS.onmessage;
        gameWS.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'player_exited') {
                setExitedPlayer(message.data.player_name);
                setTimeout(() => setExitedPlayer(null), 5000); // Clear after 5s
            }
            if (originalOnMessage) {
                originalOnMessage.call(gameWS, event);
            }
        };
    }, [gameWS]);

    // CPU turn processing refs
    // ... rest of refs

    const handleQuitGame = () => {
        console.log('[GameRoom] User quitting game');
        isQuittingRef.current = true;
        
        // Notify others before clearing local state if game is live
        if (gameWS && gameWS.readyState === WebSocket.OPEN && playerName) {
            gameWS.send(JSON.stringify({
                type: 'player_exit',
                data: { player_name: playerName }
            }));
        }

        quitGame();
        navigate('/', { replace: true });
    };

    const handleCancelLobby = async () => {
        if (!lobby) return;
        console.log('[GameRoom] Host cancelling lobby');
        isQuittingRef.current = true;
        try {
            await cancelLobby(lobby.id);
            playSound('button');
            navigate('/multiplayer', { replace: true });
        } catch (err) {
            const error = err as Error;
            console.error('Cancel lobby failed:', error);
            setError(error.message || "Cannot cancel game room once a move has been made.");
            isQuittingRef.current = false;
        }
    };

    const handleQuitLobby = async () => {
        if (!lobby) return;
        console.log('[GameRoom] Player quitting lobby');
        isQuittingRef.current = true;
        try {
            await quitLobby(lobby.id);
            playSound('button');
            navigate('/multiplayer', { replace: true });
        } catch (err) {
            const error = err as Error;
            console.error('Quit lobby failed:', error);
            setError(error.message || "Failed to quit lobby.");
            isQuittingRef.current = false;
        }
    };

    const handleStartLobby = async () => {
        if (!lobby) return;
        console.log('[GameRoom] Host starting game manually');
        try {
            await startLobby(lobby.id);
            playSound('button');
        } catch (err) {
            const error = err as Error;
            console.error('Start lobby failed:', error);
            setError(error.message || "Failed to start lobby.");
        }
    };

    const handleDiscard = async (index: number) => {
        await discardCard(index);
        playSound('discard');
    };

    const handleDraw = async () => {
        await drawCard();
        playSound('draw');
    };

    // If no game state AND no lobby state, show loading or redirect
    if (!gameState && !lobby) {
        return (
            <LoadingOverlay
                isVisible={true}
                message="Loading game..."
            />
        );
    }

    const isWaitingForPlayers = lobby && (!lobby.started || !gameState);

    return (
        <div className="game-container">
            <ErrorModal
                isOpen={!!error && !(error?.includes('Insufficient balance') || error?.includes('K0'))}
                onClose={() => setError(null)}
                message={error || ''}
                showRetryButton={error?.includes('Connection') || error?.includes('Network') || false}
                onRetry={() => window.location.reload()}
                retryButtonText="Retry Connection"
            />
            <InsufficientFundsModal
                isOpen={!!error && (error?.includes('Insufficient balance') || error?.includes('K0'))}
                onClose={() => setError(null)}
                currentBalance={userData?.wallet_balance ?? 0}
                requiredAmount={lobby?.entry_fee ?? 0}
            />

            <LoadingOverlay
                isVisible={loadingStates.starting || loadingStates.joining || loadingStates.cpuMoving}
                message={loadingStates.cpuMoving ? "CPU is thinking..." : "Connecting to game server..."}
            />

            {/* Exit Notification Overlay */}
            {exitedPlayer && (
                <div style={{
                    position: 'fixed',
                    top: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(244, 67, 54, 0.9)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    zIndex: 2000,
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    animation: 'fadeInOut 5s forwards'
                }}>
                    🚶 {exitedPlayer} has exited the game
                </div>
            )}

            {/* WebSocket Status Indicator for Multiplayer */}
            {gameState && gameState.mode === 'multiplayer' && (
                <div className="websocket-status" style={{
                    position: 'fixed',
                    bottom: '10px',
                    right: '10px',
                    background: gameWS?.readyState === WebSocket.OPEN ? '#4CAF50' : '#f44336',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 1000
                }}>
                    {gameWS?.readyState === WebSocket.OPEN ? '🟢 Live' : '🔴 Polling'}
                </div>
            )}

            {/* Game Table (Blurred if waiting) */}
            {gameState && (
                <div 
                    data-testid="game-table-container"
                    style={{
                        filter: isWaitingForPlayers ? 'blur(10px) brightness(0.7)' : 'none',
                        transition: 'filter 0.5s ease',
                        pointerEvents: isWaitingForPlayers ? 'none' : 'auto',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <LazyGameTable
                        state={gameState}
                        playerName={playerName}
                        onDiscard={handleDiscard}
                        onDraw={handleDraw}
                        loadingStates={loadingStates}
                        playSound={playSound}
                    />
                </div>
            )}

            {/* Game Waiting Overlay */}
            {isWaitingForPlayers && (
                <div 
                    className="game-waiting-overlay" 
                    data-testid="waiting-modal"
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(5px)',
                        color: 'white',
                        padding: '30px',
                        borderRadius: '20px',
                        textAlign: 'center',
                        zIndex: 1001,
                        minWidth: '320px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>Waiting for Players</h2>
                    
                    <div style={{ marginBottom: '25px' }}>
                        <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '5px' }}>Entry Fee</div>
                        <div style={{ fontSize: '1.8em', color: '#ffd700', fontWeight: 'bold' }}>K{lobby.entry_fee || 0}</div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <div style={{ fontSize: '1.2em', marginBottom: '10px' }} data-testid="players-joined">
                            Players Joined: <span style={{ fontWeight: 'bold' }}>{lobby.players.length}/{lobby.max_players}</span>
                        </div>
                        <div style={{ 
                            width: '100%', 
                            height: '8px', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                width: `${(lobby.players.length / lobby.max_players) * 100}%`,
                                height: '100%',
                                background: '#ffd700',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>

                    <p style={{ fontSize: '0.9em', opacity: 0.6, marginBottom: '20px' }}>
                        {lobby.started 
                          ? "Game initialized! Unlocking table..." 
                          : "The game table will unlock once all players have joined and wallets are deducted."}
                    </p>

                    {lobby.host_uid === currentUser?.uid ? (
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={handleCancelLobby}
                                disabled={loadingStates.starting}
                                style={{
                                    background: 'transparent',
                                    color: '#f44336',
                                    border: '1px solid #f44336',
                                    padding: '10px 20px',
                                    borderRadius: '30px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9em'
                                }}
                            >
                                {loadingStates.starting ? "..." : "Cancel"}
                            </button>
                            <button
                                onClick={handleStartLobby}
                                disabled={loadingStates.starting || lobby.players.length < 2}
                                style={{
                                    background: 'linear-gradient(to bottom, #ffd700, #ff8c00)',
                                    color: 'black',
                                    border: 'none',
                                    padding: '10px 25px',
                                    borderRadius: '30px',
                                    cursor: lobby.players.length < 2 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                    opacity: lobby.players.length < 2 ? 0.6 : 1
                                }}
                            >
                                {loadingStates.starting ? "Starting..." : "Start Game"}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleQuitLobby}
                            disabled={loadingStates.joining}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                padding: '10px 25px',
                                borderRadius: '30px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {loadingStates.joining ? "Leaving..." : "Quit Room"}
                        </button>
                    )}
                </div>
            )}

            {gameState && (
            <LazyGameOverModal
                isOpen={!!gameState.game_over}
                onClose={handleQuitGame}
                winner={gameState.winner || 'Unknown'}
                winnerHand={gameState.winner_hand}
                onNewGame={handleQuitGame}
                winAmount={gameState.pot_amount}
                winnerAmount={gameState.winner_amount}
                houseCut={gameState.house_cut}
            />
            )}
        </div>
    );
};
