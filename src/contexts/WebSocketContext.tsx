/**
 * WebSocket Context
 * 
 * React context for managing global WebSocket connections
 * and providing WebSocket services to components.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { GameWebSocketService, LobbyWebSocketService, type WebSocketMessage } from '../services/websocketService'
import { useWebSocket } from '../hooks/useWebSocket'

interface WebSocketContextType {
  // Game WebSocket
  gameService: GameWebSocketService | null
  gameConnection: {
    isConnected: boolean
    isConnecting: boolean
    isPolling: boolean
    connect: (gameId: string) => Promise<void>
    disconnect: () => void
    send: (message: WebSocketMessage) => void
    lastMessage: WebSocketMessage | null
    error: Event | null
  }
  
  // Lobby WebSocket
  lobbyService: LobbyWebSocketService | null
  lobbyConnection: {
    isConnected: boolean
    isConnecting: boolean
    isPolling: boolean
    connect: (lobbyId: string) => Promise<void>
    disconnect: () => void
    send: (message: WebSocketMessage) => void
    lastMessage: WebSocketMessage | null
    error: Event | null
  }
  
  // Global connection status
  isAnyConnected: boolean
  isAnyConnecting: boolean
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
  baseUrl?: string
}

export function WebSocketProvider({ 
  children, 
  baseUrl = 'ws://localhost:8000' 
}: WebSocketProviderProps) {
  const [gameService, setGameService] = useState<GameWebSocketService | null>(null)
  const [lobbyService, setLobbyService] = useState<LobbyWebSocketService | null>(null)

  // Initialize WebSocket services
  useEffect(() => {
    // These will be created when needed with specific IDs
    setGameService(null)
    setLobbyService(null)

    return () => {
      // Cleanup will be handled by individual service instances
    }
  }, [baseUrl])

  // Game WebSocket connection
  const gameConnection = useWebSocket(gameService, {
    autoConnect: false,
    autoReconnect: true,
    enablePollingFallback: true,
    pollingInterval: 2000
  })

  // Lobby WebSocket connection
  const lobbyConnection = useWebSocket(lobbyService, {
    autoConnect: false,
    autoReconnect: true,
    enablePollingFallback: true,
    pollingInterval: 2000
  })

  // Connect to game WebSocket
  const connectToGame = async (gameId: string) => {
    const gameWs = new GameWebSocketService(gameId, 'Player', baseUrl)
    setGameService(gameWs)
    await gameWs.connect()
  }

  // Connect to lobby WebSocket
  const connectToLobby = async (lobbyId: string) => {
    const lobbyWs = new LobbyWebSocketService(lobbyId, baseUrl)
    setLobbyService(lobbyWs)
    await lobbyWs.connect()
  }

  // Global connection status
  const isAnyConnected = gameConnection.isConnected || lobbyConnection.isConnected
  const isAnyConnecting = gameConnection.isConnecting || lobbyConnection.isConnecting

  const value: WebSocketContextType = {
    gameService,
    gameConnection: {
      ...gameConnection,
      connect: connectToGame,
      disconnect: gameConnection.disconnect
    },
    lobbyService,
    lobbyConnection: {
      ...lobbyConnection,
      connect: connectToLobby,
      disconnect: lobbyConnection.disconnect
    },
    isAnyConnected,
    isAnyConnecting
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

// Convenience hooks for specific connections
export function useGameWebSocket() {
  const { gameConnection } = useWebSocketContext()
  return gameConnection
}

export function useLobbyWebSocket() {
  const { lobbyConnection } = useWebSocketContext()
  return lobbyConnection
}
