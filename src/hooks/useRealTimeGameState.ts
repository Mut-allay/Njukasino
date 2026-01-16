/**
 * Real-time Game State Hook
 * 
 * React hook for managing real-time game state updates via WebSocket
 * with automatic state synchronization and conflict resolution.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useGameWebSocket } from '../contexts/WebSocketContext'

export interface GameState {
  id: string
  players: Player[]
  currentPlayer: string
  deck: Card[]
  discardPile: Card[]
  gamePhase: 'waiting' | 'playing' | 'finished'
  winner?: string
  winningHand?: Card[]
  lastAction?: GameAction
  timestamp: number
}

export interface Player {
  id: string
  name: string
  hand: Card[]
  isConnected: boolean
  isReady: boolean
}

export interface Card {
  suit: string
  value: string
  id: string
}

export interface GameAction {
  type: 'draw' | 'discard' | 'join' | 'leave' | 'start' | 'end'
  playerId: string
  card?: Card
  timestamp: number
}

export interface UseRealTimeGameStateOptions {
  /** Whether to automatically request state on connection */
  autoRequestState?: boolean
  /** Whether to enable optimistic updates */
  enableOptimisticUpdates?: boolean
  /** Debounce delay for state updates */
  debounceDelay?: number
}

export interface UseRealTimeGameStateReturn {
  /** Current game state */
  gameState: GameState | null
  /** Whether state is loading */
  isLoading: boolean
  /** Last error */
  error: string | null
  /** Request current game state */
  requestState: () => void
  /** Send game action */
  sendAction: (action: Omit<GameAction, 'timestamp'>) => void
  /** Clear error */
  clearError: () => void
}

export function useRealTimeGameState(
  gameId: string,
  options: UseRealTimeGameStateOptions = {}
): UseRealTimeGameStateReturn {
  const {
    autoRequestState = true,
    enableOptimisticUpdates = true,
    debounceDelay = 100
  } = options

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isConnected, send, lastMessage } = useGameWebSocket()
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastStateTimestampRef = useRef<number>(0)

  // Handle game state updates
  const handleGameStateUpdate = useCallback((newState: GameState) => {
    // Check if this is a newer state
    if (newState.timestamp <= lastStateTimestampRef.current) {
      return
    }

    lastStateTimestampRef.current = newState.timestamp
    setGameState(newState)
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
        case 'game_state':
          handleGameStateUpdate(message.data)
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
  }, [lastMessage, handleGameStateUpdate, handleError])

  // Request current game state
  const requestState = useCallback(() => {
    if (!isConnected) {
      setError('Not connected to game WebSocket')
      return
    }

    setIsLoading(true)
    send({
      type: 'request_state',
      gameId
    })
  }, [isConnected, send, gameId])

  // Send game action
  const sendAction = useCallback((action: Omit<GameAction, 'timestamp'>) => {
    if (!isConnected) {
      setError('Not connected to game WebSocket')
      return
    }

    const fullAction: GameAction = {
      ...action,
      timestamp: Date.now()
    }

    // Optimistic update if enabled
    if (enableOptimisticUpdates && gameState) {
      const optimisticState = applyOptimisticUpdate(gameState, fullAction)
      setGameState(optimisticState)
    }

    // Send action to server
    send({
      type: 'game_action',
      gameId,
      action: fullAction
    })
  }, [isConnected, send, gameId, enableOptimisticUpdates, gameState])

  // Apply optimistic update
  const applyOptimisticUpdate = (currentState: GameState, action: GameAction): GameState => {
    // This is a simplified optimistic update
    // In a real implementation, you'd want more sophisticated conflict resolution
    return {
      ...currentState,
      lastAction: action,
      timestamp: action.timestamp
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

  // Debounced state updates
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Any debounced logic would go here
    }, debounceDelay)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [gameState, debounceDelay])

  return {
    gameState,
    isLoading,
    error,
    requestState,
    sendAction,
    clearError
  }
}
