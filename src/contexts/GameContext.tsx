/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { GameState, LobbyGame, LoadingStates } from '../types/game';
import { GameService, WS_API } from '../services/gameService';
import { useAuth } from './AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';

interface GameContextType {
    // Player state
    playerName: string;
    setPlayerName: (name: string) => void;

    // Game state
    gameState: GameState | null;
    gameId: string | null;

    // Lobby state
    lobby: LobbyGame | null;
    lobbies: LobbyGame[];

    // Loading states
    loadingStates: LoadingStates;

    // Error state
    error: string | null;
    setError: (error: string | null) => void;

    // WebSocket connections
    lobbyWS: WebSocket | null;
    gameWS: WebSocket | null;

    // Game actions
    createLobby: (numPlayers: number, entryFee: number) => Promise<LobbyGame>;
    joinLobby: (lobbyId: string) => Promise<void>;
    drawCard: () => Promise<void>;
    discardCard: (index: number) => Promise<void>;
    quitGame: () => void;
    cancelLobby: (lobbyId: string) => Promise<void>;
    quitLobby: (lobbyId: string) => Promise<void>;
    startLobby: (lobbyId: string) => Promise<void>;
    refreshLobbies: () => Promise<void>;

    // Tutorial state
    isTutorial: boolean;
    tutorialStep: number;
    startTutorial: () => Promise<string | undefined>;
    setTutorialStep: (step: number) => void;
    nextTutorialStep: () => void;
    endTutorial: () => void;
    
    // Guide visibility
    isGuideVisible: boolean;
    setGuideVisible: (visible: boolean) => void;

    // State setters
    setGameState: (state: GameState | null) => void;
    setGameId: (id: string | null) => void;
    setLobby: (lobby: LobbyGame | null) => void;

    // Game service
    gameService: GameService;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within GameProvider');
    }
    return context;
};

interface GameProviderProps {
    children: ReactNode;
    playerName: string;
    setPlayerName: (name: string) => void;
}

export const GameProvider = ({ children, playerName, setPlayerName }: GameProviderProps) => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [gameId, setGameId] = useState<string | null>(null);
    const [lobby, setLobby] = useState<LobbyGame | null>(null);
    const [lobbies, setLobbies] = useState<LobbyGame[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        starting: false,
        joining: false,
        drawing: false,
        discarding: false,
        cpuMoving: false,
    });
    const [isRehydrating, setIsRehydrating] = useState(true);

    // Tutorial state
    const [isTutorial, setIsTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [isGuideVisible, setGuideVisible] = useState(true);

    // WebSocket states
    const [lobbyWS, setLobbyWS] = useState<WebSocket | null>(null);
    const [gameWS, setGameWS] = useState<WebSocket | null>(null);

    // Initialize game service (use useMemo to avoid recreating on every render)
    const gameService = useMemo(() => new GameService(), []);

    const quitGame = useCallback(() => {
        console.log("[GameContext] Quitting game - clearing all state");
        // Close WebSocket connections
        if (gameWS) {
            gameWS.close();
            setGameWS(null);
        }
        if (lobbyWS) {
            lobbyWS.close();
            setLobbyWS(null);
        }

        // ⬇️ FORCE CLEAR EVERYTHING
        setGameState(null);
        setLobby(null);
        setGameId(null);
        setError(null);
    }, [gameWS, lobbyWS]);

    // Rehydrate from URL on mount + refresh
    useEffect(() => {
        const tryRecover = async () => {
            const path = location.pathname;
            const isLobbyPath = path.startsWith('/lobby/');
            const isGamePath = path.startsWith('/game/');

            if (!isLobbyPath && !isGamePath) {
                setIsRehydrating(false);
                return;
            }

            // Extract IDs from path
            const lobbyIdFromUrl = isLobbyPath ? path.split('/lobby/')[1]?.split('/')[0] : null;
            const gameIdFromUrl = isGamePath ? path.split('/game/')[1]?.split('/')[0] : null;

            // If we already have the state and it matches the URL, skip
            if (isLobbyPath && lobby?.id === lobbyIdFromUrl) {
                setIsRehydrating(false);
                return;
            }
            if (isGamePath && gameId === gameIdFromUrl) {
                setIsRehydrating(false);
                return;
            }

            console.log(`[GameContext] Detected recovery path: ${path}`);
            setIsRehydrating(true);
            setError(null);

            try {
                if (isLobbyPath && lobbyIdFromUrl) {
                    console.log(`[GameContext] Attempting to recover lobby: ${lobbyIdFromUrl}`);
                    const lobbyData = await gameService.getLobby(lobbyIdFromUrl);
                    if (lobbyData) {
                        setLobby(lobbyData);
                        if (lobbyData.started && lobbyData.game_id) {
                            console.log(`[GameContext] Lobby already started, fetching game: ${lobbyData.game_id}`);
                            const gameData = await gameService.getGame(lobbyData.game_id);
                            setGameState(gameData);
                            setGameId(lobbyData.game_id);
                        }
                    } else {
                        throw new Error("Lobby not found");
                    }
                } else if (isGamePath && gameIdFromUrl) {
                    console.log(`[GameContext] Attempting to recover game: ${gameIdFromUrl}`);
                    const gameData = await gameService.getGame(gameIdFromUrl);
                    if (gameData) {
                        setGameState(gameData);
                        setGameId(gameIdFromUrl);
                    } else {
                        throw new Error("Game not found");
                    }
                }
            } catch (err) {
                console.error('[GameContext] Rehydration failed:', err);
                setError(err instanceof Error ? err.message : "Failed to restore game session");
                // Clear state on failure so child components don't try to use stale data
                setLobby(null);
                setGameState(null);
                setGameId(null);
            } finally {
                // Add a small delay for smoother transition
                setTimeout(() => setIsRehydrating(false), 500);
            }
        };

        // Delay recovery slightly to ensure auth and player name are stable
        const timer = setTimeout(tryRecover, 100);
        return () => clearTimeout(timer);
    }, [location.pathname, gameService, lobby?.id, gameId]);

    // WebSocket connection for lobby room updates
    const lobbyIdForWS = lobby?.id;
    useEffect(() => {
        if (lobbyIdForWS) {
            const ws = new WebSocket(`${WS_API}/ws/lobby/${lobbyIdForWS}`);
            ws.onopen = () => {
                console.log('Connected to lobby WebSocket');
                setLobbyWS(ws);
            };
            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'lobby_update') {
                    const updatedLobby = message.data;
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/b45a7468-79f5-4c75-8b9c-932b18089e84', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'GameContext.tsx:lobbyWS.onmessage', message: 'lobby_update received', data: { started: updatedLobby?.started, game_id: updatedLobby?.game_id, hasData: !!updatedLobby }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => {});
                    // #endregion
                    setLobby(updatedLobby);

                    // ⬇️ IMPROVED ROUTING TRIGGER
                    if (updatedLobby.started && updatedLobby.game_id) {
                        console.log(`[LobbyWS] Quorum reached! Routing to Game: ${updatedLobby.game_id}`);
                        setGameId(updatedLobby.game_id);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/b45a7468-79f5-4c75-8b9c-932b18089e84', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'GameContext.tsx:lobbyWS.started', message: 'setting gameId and fetching game', data: { game_id: updatedLobby.game_id }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => {});
                        // #endregion
                        try {
                            // Immediately fetch the fresh game state to force the UI to switch
                            const freshGame = await gameService.getGame(updatedLobby.game_id);
                            console.log(`[LobbyWS] Fetched fresh game state. Players: ${freshGame.players.map(p => p.name).join(', ')}`);
                            setGameState(freshGame);
                            // #region agent log
                            fetch('http://127.0.0.1:7242/ingest/b45a7468-79f5-4c75-8b9c-932b18089e84', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'GameContext.tsx:lobbyWS.setGameState', message: 'game state set after fetch', data: { playerCount: freshGame.players?.length }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => {});
                            // #endregion
                        } catch (err) {
                            console.error('[LobbyWS] Failed to fetch starting game state:', err);
                        }
                    }
                } else if (message.type === 'lobby_cancelled') {
                    console.log('[GameContext] Lobby cancelled by host');
                    setError("The host has cancelled the game room. Any entry fees have been refunded.");
                    quitGame();
                }
            };
            ws.onclose = () => {
                console.log('Lobby WebSocket closed');
                setLobbyWS(null);
            };
            ws.onerror = (error) => {
                console.error('Lobby WebSocket error:', error);
                setLobbyWS(null);
            };

            return () => {
                ws.close();
                setLobbyWS(null);
            };
        }
    }, [lobbyIdForWS, gameService, quitGame]);

    // WebSocket connection for game updates (multiplayer only)
    const gameStateIdForWS = gameState?.id;
    useEffect(() => {
        if (gameStateIdForWS && gameState?.mode === 'multiplayer' && playerName) {
            const ws = new WebSocket(`${WS_API}/ws/game/${gameStateIdForWS}?player_name=${encodeURIComponent(playerName)}`);
            ws.onopen = () => {
                console.log('Connected to game WebSocket');
                setGameWS(ws);
            };
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'game_update') {
                    setGameState(message.data);
                    if (message.data.id) {
                        setGameId(message.data.id);
                    }
                }
            };
            ws.onclose = () => {
                console.log('Game WebSocket closed');
                setGameWS(null);
            };
            ws.onerror = (error) => {
                console.error('Game WebSocket error:', error);
                setGameWS(null);
            };

            return () => {
                ws.close();
                setGameWS(null);
            };
        }
    }, [gameStateIdForWS, gameState?.mode, playerName]);

    // Combined polling fallback for both Lobby and Game states
    useEffect(() => {
        if (!lobby && !gameId) return;

        const interval = setInterval(async () => {
            try {
                // Poll lobby if in waiting room — use GET /lobby/:id so we see started lobbies (list_lobbies hides them)
                if (lobby && !lobby.started) {
                    try {
                        const currentLobby = await gameService.getLobby(lobby.id);
                        setLobby(currentLobby);
                        if (currentLobby.started && currentLobby.game_id) {
                            console.log(`[GameContext] Polling detected lobby start! Game: ${currentLobby.game_id}`);
                            setGameId(currentLobby.game_id);
                            const game = await gameService.getGame(currentLobby.game_id);
                            setGameState(game);
                        }
                    } catch {
                        // Lobby may have been cancelled or not found
                    }
                }

                // Poll game if in progress
                if (gameId) {
                    const isMultiplayerWithoutWS = gameState?.mode === 'multiplayer' && (!gameWS || gameWS.readyState !== WebSocket.OPEN);
                    
                    // Also poll if player is not found in game state (handles race conditions)
                    const playerNameToMatch = playerName?.trim().toLowerCase() || '';
                    const playerInGame = gameState?.players.find(p => 
                        p.name.trim().toLowerCase() === playerNameToMatch
                    );
                    const shouldPollForPlayer = gameState && !playerInGame && gameState.mode === 'multiplayer';
                    
                    if (isMultiplayerWithoutWS || shouldPollForPlayer) {
                        const game = await gameService.getGame(gameId);
                        const refreshedPlayerInGame = game.players.find(p => 
                            p.name.trim().toLowerCase() === playerNameToMatch
                        );
                        if (refreshedPlayerInGame || shouldPollForPlayer) {
                            console.log(`[GameContext] Polling updated game state. Player found: ${!!refreshedPlayerInGame}`);
                            setGameState(game);
                        }
                    }
                }
            } catch (error: unknown) {
                console.error('Polling failed:', error);
            }
        }, 3000); // Poll every 3 seconds for better reliability

        return () => clearInterval(interval);
    }, [lobby, gameId, gameWS, gameState, gameService, playerName]);

    // Game actions
    const createLobby = useCallback(async (numPlayers: number, entryFee: number = 0) => {
        // ⬇️ FORCE RESET: Clear previous game state
        setGameState(null);
        setGameId(null);
        setLobby(null);
        
        setLoadingStates(prev => ({ ...prev, starting: true }));
        setError(null);
        try {
            if (!currentUser) throw new Error("User must be logged in to create a game");
            
            // Create lobby first
            const newLobby = await gameService.createLobby(playerName, currentUser.uid, numPlayers, entryFee);
            setLobby(newLobby);

            // WE DO NOT START THE GAME HERE
            // The backend will trigger the game start via WebSocket when the second player joins.
            // We just wait in the lobby.
            setGameId(null);
            setGameState(null);
            return newLobby;
        } catch (error: unknown) {
            // ⬇️ HANDLE WALLET ERROR
            const msg = error instanceof Error ? error.message : "Failed to create";
            if (msg.includes("Insufficient balance") || msg.includes("balance")) {
                setError(msg); // This will trigger your pop-up logic
            } else {
                setError(msg);
            }
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [playerName, gameService, currentUser]);

    const joinLobby = useCallback(async (lobbyId: string) => {
        setLoadingStates(prev => ({ ...prev, joining: true }));
        setError(null);
        try {
            if (!currentUser) throw new Error("User must be logged in to join a game");

            // Join the lobby
            const response = await gameService.joinLobby(lobbyId, playerName, currentUser.uid);
            setLobby(response.lobby);

            // If the backend returned a game (meaning the lobby is full and game started), use it
            if (response.game) {
                const gameId = response.game.id;
                console.log(`[GameContext] Game started after joining lobby. Players: ${response.game.players.map(p => p.name).join(', ')}`);
                setGameState(response.game);
                setGameId(gameId);
                
                // Verify the current player is in the game state
                const playerNameToMatch = playerName.trim().toLowerCase();
                const playerInGame = response.game.players.find(p => 
                    p.name.trim().toLowerCase() === playerNameToMatch
                );
                
                if (!playerInGame) {
                    console.warn(`[GameContext] Player ${playerName} not found in game state. Players: ${response.game.players.map(p => p.name).join(', ')}`);
                    // Try to fetch the game state again after a short delay
                    setTimeout(async () => {
                        try {
                            const refreshedGame = await gameService.getGame(gameId);
                            console.log(`[GameContext] Refreshed game state. Players: ${refreshedGame.players.map(p => p.name).join(', ')}`);
                            setGameState(refreshedGame);
                        } catch (err) {
                            console.error('[GameContext] Failed to refresh game state:', err);
                        }
                    }, 1000);
                }
            }

            // Otherwise, we just wait in the lobby for the WebSocket update
        } catch (error: unknown) {
            // ⬇️ HANDLE WALLET ERROR
            const msg = error instanceof Error ? error.message : "Failed to join";
            if (msg.includes("Insufficient balance") || msg.includes("balance")) {
                setError(msg); // This will trigger your pop-up logic
            } else {
                setError(msg);
            }
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, joining: false }));
        }
    }, [playerName, gameService, currentUser]);

    const drawCard = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, drawing: true }));
        setError(null);
        try {
            if (!gameState) return;
            const newState = await gameService.drawCard(gameState.id);
            setGameState(newState);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to draw card");
        } finally {
            setLoadingStates(prev => ({ ...prev, drawing: false }));
        }
    }, [gameState, gameService]);

    const discardCard = useCallback(async (index: number) => {
        setLoadingStates(prev => ({ ...prev, discarding: true }));
        setError(null);
        try {
            if (!gameState) return;
            const newState = await gameService.discardCard(gameState.id, index);
            setGameState(newState);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to discard card");
        } finally {
            setLoadingStates(prev => ({ ...prev, discarding: false }));
        }
    }, [gameState, gameService]);

    const cancelLobby = useCallback(async (lobbyId: string) => {
        setLoadingStates(prev => ({ ...prev, starting: true }));
        setError(null);
        try {
            if (!currentUser) throw new Error("User not logged in");
            await gameService.cancelLobby(lobbyId, currentUser.uid);
            // Clear local state
            setLobby(null);
            setGameState(null);
            setGameId(null);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to cancel lobby");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [gameService, currentUser]);

    const quitLobby = useCallback(async (lobbyId: string) => {
        setLoadingStates(prev => ({ ...prev, joining: true }));
        setError(null);
        try {
            if (!currentUser) throw new Error("User not logged in");
            await gameService.quitLobby(lobbyId, currentUser.uid);
            setLobby(null);
            setGameState(null);
            setGameId(null);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to quit lobby");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, joining: false }));
        }
    }, [gameService, currentUser]);

    const startLobby = useCallback(async (lobbyId: string) => {
        setLoadingStates(prev => ({ ...prev, starting: true }));
        setError(null);
        try {
            if (!currentUser) throw new Error("User not logged in");
            const response = await gameService.startLobby(lobbyId, currentUser.uid);
            setLobby(response.lobby);
            setGameState(response.game);
            setGameId(response.game.id);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to start lobby");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [gameService, currentUser]);

    const refreshLobbies = useCallback(async () => {
        try {
            const lobbies = await gameService.getLobbies();
            setLobbies(lobbies || []);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to fetch lobbies");
            setLobbies([]);
        }
    }, [gameService]);

    const endTutorial = useCallback(() => {
        setIsTutorial(false);
        setTutorialStep(0);
        setGuideVisible(true);
    }, []);

    const startTutorial = useCallback(async () => {
        setIsTutorial(true);
        setTutorialStep(0);
        setGuideVisible(true);
        
        // ⬇️ FORCE RESET: Clear previous game state
        setGameState(null);
        setGameId(null);
        setLobby(null);

        setLoadingStates(prev => ({ ...prev, starting: true }));
        try {
            console.log("[GameContext] Requesting tutorial game...");
            const game = await gameService.createNewGame("tutorial", playerName, currentUser?.uid || "", 1, 0);
            console.log("[GameContext] Tutorial game created:", JSON.stringify(game));
            
            setGameState(game);
            setGameId(game.id);
            return game.id;
        } catch (error: unknown) {
            console.error("[GameContext] startTutorial error:", error);
            setError(error instanceof Error ? error.message : "Failed to start tutorial");
            return undefined;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [playerName, gameService, currentUser]);

    const nextTutorialStep = useCallback(() => {
        setTutorialStep(prev => prev + 1);
        setGuideVisible(true);
    }, []);

    const value = {
        playerName,
        setPlayerName,
        gameState,
        setGameState,
        gameId,
        setGameId,
        lobby,
        setLobby,
        lobbies,
        loadingStates,
        error,
        setError,
        lobbyWS,
        gameWS,
        createLobby,
        joinLobby,
        startTutorial,
        drawCard,
        discardCard,
        quitGame,
        cancelLobby,
        quitLobby,
        startLobby,
        refreshLobbies,
        gameService,
        isTutorial,
        tutorialStep,
        setTutorialStep,
        nextTutorialStep,
        endTutorial,
        isGuideVisible,
        setGuideVisible
    };

    if (isRehydrating && (location.pathname.startsWith('/lobby/') || location.pathname.startsWith('/game/'))) {
        return <LoadingOverlay isVisible message="Restoring your game…" />;
    }

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
