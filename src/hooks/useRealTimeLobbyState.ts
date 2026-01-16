/**
 * Real-time Lobby State Hook
 * 
 * React hook for managing real-time lobby state updates via WebSocket
 * with automatic state synchronization.
 */

import { useEffect, useState, useCallback } from 'react'
import { useLobbyWebSocket } from '../contexts/WebSocketContext'

export interface LobbyState {
  id: string
  name: string
  players: LobbyPlayer[]
  maxPlayers: number
  gameId?: string
  status: 'waiting' | 'starting' | 'in_progress' | 'finished'
  hostId: string
  createdAt: string
  lastActivity: string
}

export interface LobbyPlayer {
  id: string
  name: string
  isConnected: boolean
  isReady: boolean
  joinedAt: string
}

export interface LobbyAction {
  type: 'join' | 'leave' | 'ready' | 'unready' | 'start_game' | 'kick_player'
  playerId: string
  targetPlayerId?: string
  timestamp: number
}

export interface UseRealTimeLobbyStateOptions {
  /** Whether to automatically request state on connection */
  autoRequestState?: boolean
  /** Whether to enable optimistic updates */
  enableOptimisticUpdates?: boolean
}

export interface UseRealTimeLobbyStateReturn {
  /** Current lobby state */
  lobbyState: LobbyState | null
  /** Whether state is loading */
  isLoading: boolean
  /** Last error */
  error: string | null
  /** Request current lobby state */
  requestState: () => void
  /** Send lobby action */
  sendAction: (action: Omit<LobbyAction, 'timestamp'>) => void
  /** Clear error */
  clearError: () => void
}

export function useRealTimeLobbyState(
  lobbyId: string,
  options: UseRealTimeLobbyStateOptions = {}
): UseRealTimeLobbyStateReturn {
  const {
    autoRequestState = true,
    enableOptimisticUpdates = true
  } = options

  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isConnected, send, lastMessage } = useLobbyWebSocket()

  // Handle lobby state updates
  const handleLobbyStateUpdate = useCallback((newState: LobbyState) => {
    setLobbyState(newState)
    setIsLoading(false)
    setError(null)
  }, [])

  // Handle errors
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setIsLoading(false)
  }, [])

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return

    try {
      const messageData = typeof lastMessage.data === 'string' ? lastMessage.data : JSON.stringify(lastMessage.data)
      const message = JSON.parse(messageData)
      
      switch (message.type) {
        case 'lobby_state':
          handleLobbyStateUpdate(message.data)
          break
        case 'error':
          handleError(message.error)
          break
        case 'pong':
          // Handle ping response
          break
        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err)
      handleError('Failed to parse server message')
    }
  }, [lastMessage, handleLobbyStateUpdate, handleError])

  // Request current lobby state
  const requestState = useCallback(() => {
    if (!isConnected) {
      setError('Not connected to lobby WebSocket')
      return
    }

    setIsLoading(true)
    send({
      type: 'request_state',
      lobbyId
    })
  }, [isConnected, send, lobbyId])

  // Send lobby action
  const sendAction = useCallback((action: Omit<LobbyAction, 'timestamp'>) => {
    if (!isConnected) {
      setError('Not connected to lobby WebSocket')
      return
    }

    const fullAction: LobbyAction = {
      ...action,
      timestamp: Date.now()
    }

    // Optimistic update if enabled
    if (enableOptimisticUpdates && lobbyState) {
      const optimisticState = applyOptimisticUpdate(lobbyState)
      setLobbyState(optimisticState)
    }

    // Send action to server
    send({
      type: 'lobby_action',
      lobbyId,
      action: fullAction
    })
  }, [isConnected, send, lobbyId, enableOptimisticUpdates, lobbyState])

  // Apply optimistic update
  const applyOptimisticUpdate = (currentState: LobbyState): LobbyState => {
    // This is a simplified optimistic update
    // In a real implementation, you'd want more sophisticated conflict resolution
    return {
      ...currentState,
      lastActivity: new Date().toISOString()
    }
  }

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-request state on connection
  useEffect(() => {
    if (isConnected && autoRequestState) {
      requestState()
    }
  }, [isConnected, autoRequestState, requestState])

  return {
    lobbyState,
    isLoading,
    error,
    requestState,
    sendAction,
    clearError
  }
}
