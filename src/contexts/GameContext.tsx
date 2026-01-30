import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { GameState, LobbyGame, LoadingStates } from '../types/game';
import { GameService, WS_API } from '../services/gameService';

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
    startCPUGame: (numCPU: number, entryFee: number) => Promise<string | undefined>;
    drawCard: () => Promise<void>;
    discardCard: (index: number) => Promise<void>;
    quitGame: () => void;
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

    // Tutorial state
    const [isTutorial, setIsTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [isGuideVisible, setGuideVisible] = useState(true);

    // WebSocket states
    const [lobbyWS, setLobbyWS] = useState<WebSocket | null>(null);
    const [gameWS, setGameWS] = useState<WebSocket | null>(null);

    // Initialize game service (use useMemo to avoid recreating on every render)
    const gameService = useMemo(() => new GameService(), []);

    // WebSocket connection for lobby room updates
    const lobbyIdForWS = lobby?.id;
    useEffect(() => {
        if (lobbyIdForWS) {
            const ws = new WebSocket(`${WS_API}/ws/lobby/${lobbyIdForWS}`);
            ws.onopen = () => {
                console.log('Connected to lobby WebSocket');
                setLobbyWS(ws);
            };
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'lobby_update') {
                    setLobby(message.data);
                    if (message.data.started && message.data.game_id) {
                        console.log(`[GameContext] Lobby WebSocket: Game started with ID ${message.data.game_id}`);
                        setGameId(message.data.game_id);
                        gameService.getGame(message.data.game_id)
                            .then((game) => {
                                console.log(`[GameContext] Fetched game state. Players: ${game.players.map(p => p.name).join(', ')}`);
                                setGameState(game);
                            })
                            .catch(error => {
                                console.error('[GameContext] Failed to fetch game state:', error);
                                setError(error.message);
                            });
                    }
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
    }, [lobbyIdForWS, gameService]);

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
                // Poll lobby if in waiting room
                if (lobby && !gameState) {
                    const allLobbies = await gameService.getLobbies();
                    const currentLobby = allLobbies.find(l => l.id === lobby.id);
                    if (currentLobby) {
                        setLobby(currentLobby);
                        if (currentLobby.started && currentLobby.game_id) {
                            setGameId(currentLobby.game_id);
                            const game = await gameService.getGame(currentLobby.game_id);
                            setGameState(game);
                        }
                    }
                }

                // Poll game if in progress
                if (gameId) {
                    const isCPUGame = gameState?.mode === 'cpu';
                    const isMultiplayerWithoutWS = gameState?.mode === 'multiplayer' && (!gameWS || gameWS.readyState !== WebSocket.OPEN);
                    
                    // Also poll if player is not found in game state (handles race conditions)
                    const playerNameToMatch = playerName?.trim().toLowerCase() || '';
                    const playerInGame = gameState?.players.find(p => 
                        p.name.trim().toLowerCase() === playerNameToMatch
                    );
                    const shouldPollForPlayer = gameState && !playerInGame && gameState.mode === 'multiplayer';
                    
                    if (isCPUGame || isMultiplayerWithoutWS || shouldPollForPlayer) {
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
            // Create lobby first
            const newLobby = await gameService.createLobby(playerName, numPlayers, entryFee);
            setLobby(newLobby);

            // WE DO NOT START THE GAME HERE
            // The backend will trigger the game start via WebSocket when the second player joins.
            // We just wait in the lobby.
            setGameId(null);
            setGameState(null);
            return newLobby;
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to create game");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [playerName, gameService]);

    const joinLobby = useCallback(async (lobbyId: string) => {
        setLoadingStates(prev => ({ ...prev, joining: true }));
        setError(null);
        try {
            // Join the lobby
            const response = await gameService.joinLobby(lobbyId, playerName);
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
            setError(error instanceof Error ? error.message : "Failed to join game");
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, joining: false }));
        }
    }, [playerName, gameService]);

    const startCPUGame = useCallback(async (numCPU: number, entryFee: number) => {
        console.log(`[GameContext] startCPUGame called for ${numCPU} CPUs with fee ${entryFee}`);
        // ⬇️ FORCE RESET: Clear previous game state
        setGameState(null);
        setGameId(null);
        setLobby(null);

        setLoadingStates(prev => ({ ...prev, starting: true }));
        try {
            console.log("[GameContext] Requesting createNewGame...");
            let game = await gameService.createNewGame("cpu", playerName, numCPU, entryFee);
            console.log("[GameContext] createNewGame response:", JSON.stringify(game));
            
            // ⬇️ WORKAROUND: If backend returns a finished game (sticky session), try to flush it
            // CHECK: game_over might be missing or false, so also check if 'winner' is present
            const isFinished = game.game_over === true || !!game.winner;
            
            if (isFinished) {
                console.warn(`[GameContext] Backend returned a finished game (game_over=${game.game_over}, winner=${game.winner}). Attempting to flush session...`);
                try {
                    // Attempt to 'cancel' the stuck game ID to clear it from backend memory
                    console.log(`[GameContext] Cancelling stuck game ID: ${game.id}`);
                    await gameService.cancelLobby(game.id, playerName).catch((e) => console.warn("cancelLobby failed safely:", e));
                    
                    // Small delay to allow backend to process
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Retry creating the game
                    console.log("[GameContext] Retrying new game creation...");
                    game = await gameService.createNewGame("cpu", playerName, numCPU, entryFee);
                    console.log("[GameContext] Retry response:", JSON.stringify(game));
                    
                    const isRetryFinished = game.game_over === true || !!game.winner;
                    if (isRetryFinished) {
                        throw new Error(`Unable to start new game: Server returned finished game ID ${game.id}. Please refresh the page.`);
                    }
                } catch (retryError: unknown) {
                    console.error("[GameContext] Retry failed:", retryError);
                    throw retryError; // Re-throw to be caught by outer block
                }
            }

            setGameState(game);
            setGameId(game.id);
            return game.id;
        } catch (error: unknown) {
            console.error("[GameContext] startCPUGame error:", error);
            setError(error instanceof Error ? error.message : "Failed to create game");
            return undefined;
        } finally {
            setLoadingStates(prev => ({ ...prev, starting: false }));
        }
    }, [playerName, gameService]);

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
            const game = await gameService.createNewGame("tutorial", playerName, 1, 0);
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
    }, [playerName, gameService]);

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
        startCPUGame,
        startTutorial,
        drawCard,
        discardCard,
        quitGame,
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

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
