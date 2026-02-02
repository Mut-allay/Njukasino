import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import LazyGameTable from '../components/LazyGameTable';
import LazyGameOverModal from '../components/LazyGameOverModal';
import ErrorModal from '../components/ErrorModal';
import LoadingOverlay from '../components/LoadingOverlay';

interface GameRoomPageProps {
    playSound: (soundType: 'draw' | 'discard' | 'win' | 'button' | 'shuffle') => void;
}

export const GameRoomPage = ({ playSound }: GameRoomPageProps) => {
    const navigate = useNavigate();
    const { lobbyId, gameId: urlGameId } = useParams();
    const {
        gameState,
        setGameState,
        playerName,
        lobby,
        setLobby,
        gameId,
        setGameId,
        loadingStates,
        error,
        setError,
        gameWS,
        drawCard,
        discardCard,
        quitGame,
        gameService,
    } = useGame();

    // Track if we are in the process of quitting to prevent re-sync
    const isQuittingRef = useRef(false);

    // Initial state sync from URL params
    useEffect(() => {
        const syncState = async () => {
            if (isQuittingRef.current) return;
            try {
                // If we have a lobbyId in URL but no lobby in context
                if (lobbyId && (!lobby || lobby.id !== lobbyId)) {
                    console.log(`[GameRoom] Syncing lobby: ${lobbyId}`);
                    const allLobbies = await gameService.getLobbies();
                    const foundLobby = allLobbies.find(l => l.id === lobbyId);
                    if (foundLobby) {
                        setLobby(foundLobby);
                        if (foundLobby.game_id) {
                            setGameId(foundLobby.game_id);
                        }
                    }
                }

                // If we have a gameId in URL (or derived from lobby) but no state
                const targetGameId = urlGameId || gameId || lobby?.game_id;
                if (targetGameId && (!gameState || gameState.id !== targetGameId)) {
                    console.log(`[GameRoom] Syncing game: ${targetGameId}`);
                    const fetchedGame = await gameService.getGame(targetGameId);
                    setGameState(fetchedGame);
                    setGameId(targetGameId);
                }
            } catch (err) {
                console.error('[GameRoom] Sync error:', err);
                // Don't show full screen error for background sync
            }
        };

        syncState();
    }, [lobbyId, urlGameId, lobby, gameId, gameState, gameService, setLobby, setGameId, setGameState]);

    // CPU turn processing refs
    const cpuProcessingRef = useRef(false);
    const processingPlayerRef = useRef<number | null>(null);

    // CPU turn processing - automatically handle CPU moves
    useEffect(() => {
        if (!gameState || gameState.mode !== 'cpu' || gameState.game_over) {
            cpuProcessingRef.current = false;
            processingPlayerRef.current = null;
            return;
        }

        const currentPlayer = gameState.players[gameState.current_player];
        if (!currentPlayer || !currentPlayer.is_cpu) {
            // Not a CPU turn - reset processing flags
            cpuProcessingRef.current = false;
            processingPlayerRef.current = null;
            return;
        }

        // Check if we're already processing this specific player's turn
        const currentPlayerIndex = gameState.current_player;
        if (cpuProcessingRef.current && processingPlayerRef.current === currentPlayerIndex) {
            // Already processing this player's turn
            return;
        }

        // New CPU turn - mark as processing
        cpuProcessingRef.current = true;
        processingPlayerRef.current = currentPlayerIndex;

        console.log(`CPU turn detected: ${currentPlayer.name}, has_drawn: ${gameState.has_drawn}`);

        // Check if CPU needs to draw
        if (!gameState.has_drawn) {
            console.log(`CPU ${currentPlayer.name} drawing card...`);

            // CPU draws a card
            gameService.drawCard(gameState.id)
                .then((newState) => {
                    console.log(`CPU ${currentPlayer.name} drew card. New state - has_drawn: ${newState.has_drawn}, current_player: ${newState.current_player}`);
                    playSound('draw');

                    // After drawing, CPU needs to discard
                    // Wait a bit for visual feedback, then discard
                    const gameIdToUse = newState.id;
                    const currentPlayerIndex = newState.current_player;

                    setTimeout(() => {
                        // Fetch latest state before discarding to avoid stale data
                        gameService.getGame(gameIdToUse)
                            .then((latestState) => {
                                // Verify it's still the CPU's turn and they have drawn
                                const latestCurrentPlayer = latestState.players[latestState.current_player];
                                if (latestCurrentPlayer && latestCurrentPlayer.is_cpu &&
                                    latestState.current_player === currentPlayerIndex &&
                                    latestState.has_drawn &&
                                    latestState.players[latestState.current_player].hand.length > 0) {

                                    // CPU discards the first card (simple strategy)
                                    const discardIndex = 0;
                                    console.log(`CPU ${latestCurrentPlayer.name} discarding card at index ${discardIndex}...`);

                                    return gameService.discardCard(gameIdToUse, discardIndex)
                                        .then((finalState) => {
                                            console.log(`CPU ${latestCurrentPlayer.name} discarded. New current_player: ${finalState.current_player}`);
                                            playSound('discard');
                                            cpuProcessingRef.current = false;
                                            processingPlayerRef.current = null;
                                        })
                                        .catch((error) => {
                                            console.error('CPU discard failed:', error);
                                            cpuProcessingRef.current = false;
                                            processingPlayerRef.current = null;
                                        });
                                } else {
                                    console.log('CPU turn state changed, skipping discard');
                                    cpuProcessingRef.current = false;
                                    processingPlayerRef.current = null;
                                }
                            })
                            .catch((error) => {
                                console.error('Failed to fetch latest game state for CPU discard:', error);
                                cpuProcessingRef.current = false;
                                processingPlayerRef.current = null;
                            });
                    }, 1500); // 1.5 second delay between draw and discard
                })
                .catch((error) => {
                    console.error('CPU draw failed:', error);
                    cpuProcessingRef.current = false;
                    processingPlayerRef.current = null;
                });
        } else {
            // CPU has drawn but needs to discard
            console.log(`CPU ${currentPlayer.name} discarding card (already drawn)...`);

            // CPU discards the first card
            const discardIndex = 0;
            gameService.discardCard(gameState.id, discardIndex)
                .then((newState) => {
                    console.log(`CPU ${currentPlayer.name} discarded. New current_player: ${newState.current_player}`);
                    playSound('discard');
                    cpuProcessingRef.current = false;
                    processingPlayerRef.current = null;
                })
                .catch((error) => {
                    console.error('CPU discard failed:', error);
                    cpuProcessingRef.current = false;
                    processingPlayerRef.current = null;
                });
        }
    }, [gameState, gameService, playSound]);

    const handleQuitGame = () => {
        console.log('[GameRoom] User quitting game');
        isQuittingRef.current = true;
        quitGame();
        // Clear potential lingering URL params matching
        navigate('/', { replace: true });
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

    return (
        <div className="game-container">
            <ErrorModal
                isOpen={!!error}
                onClose={() => setError(null)}
                message={error || ''}
                showRetryButton={error?.includes('Connection') || error?.includes('Network') || false}
                onRetry={() => window.location.reload()}
                retryButtonText="Retry Connection"
            />

            <LoadingOverlay
                isVisible={loadingStates.starting || loadingStates.joining || loadingStates.cpuMoving}
                message={loadingStates.cpuMoving ? "CPU is thinking..." : "Connecting to game server..."}
            />

            {/* WebSocket Status Indicator for Multiplayer */}
            {gameState && gameState.mode === 'multiplayer' && (
                <div className="websocket-status" style={{
                    position: 'fixed',
                    top: '10px',
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

            {/* Debug Info for Multiplayer */}
            {gameState && gameState.mode === 'multiplayer' && (
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    zIndex: 1000,
                    maxWidth: '200px'
                }}>
                    <div>Players: {gameState.players.length}/{gameState.max_players}</div>
                    <div>Has Drawn: {gameState.has_drawn ? 'Yes' : 'No'}</div>
                    <div>Pot: {gameState.pot.length} cards</div>
                    <div>Host: {lobby?.host}</div>
                    <div>You: {playerName}</div>
                    <div>Is Host: {lobby?.host === playerName ? 'Yes' : 'No'}</div>
                </div>
            )}

            {/* Game Waiting State */}
            {(!gameState && lobby) && (
                <div className="game-waiting-overlay" style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    zIndex: 1001,
                    minWidth: '300px'
                }}>
                    <h3>Waiting for players to join...</h3>
                    <div style={{ margin: '20px 0', fontSize: '1.2em' }}>
                        Players: {lobby.players.length}/{lobby.max_players}
                    </div>
                    {lobby.host === playerName && (
                        <button
                            onClick={handleQuitGame}
                            disabled={loadingStates.starting}
                            style={{
                                background: '#f44336',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                marginTop: '10px'
                            }}
                        >
                            {loadingStates.starting ? "Cancelling..." : "Cancel Game"}
                        </button>
                    )}
                </div>
            )}

            {gameState && (
                <LazyGameTable
                    state={gameState}
                    playerName={playerName}
                    onDiscard={handleDiscard}
                    onDraw={handleDraw}
                    loadingStates={loadingStates}
                    playSound={playSound}
                />
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
