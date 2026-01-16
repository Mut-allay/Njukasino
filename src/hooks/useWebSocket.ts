/**
 * WebSocket Hook
 * 
 * React hook for managing WebSocket connections with automatic reconnection
 * and fallback to polling.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import type { WebSocketService, WebSocketMessage } from '../services/websocketService'

export interface UseWebSocketOptions {
  /** Whether to automatically connect on mount */
  autoConnect?: boolean
  /** Whether to enable automatic reconnection */
  autoReconnect?: boolean
  /** Fallback to polling if WebSocket fails */
  enablePollingFallback?: boolean
  /** Polling interval in milliseconds */
  pollingInterval?: number
  /** Callback for when connection is established */
  onConnect?: () => void
  /** Callback for when connection is lost */
  onDisconnect?: () => void
  /** Callback for when an error occurs */
  onError?: (error: Event) => void
}

export interface UseWebSocketReturn {
  /** Whether WebSocket is connected */
  isConnected: boolean
  /** Whether WebSocket is connecting */
  isConnecting: boolean
  /** Whether polling fallback is active */
  isPolling: boolean
  /** Connect to WebSocket */
  connect: () => Promise<void>
  /** Disconnect from WebSocket */
  disconnect: () => void
  /** Send a message */
  send: (message: WebSocketMessage) => void
  /** Last received message */
  lastMessage: WebSocketMessage | null
  /** Connection error */
  error: Event | null
}

export function useWebSocket(
  webSocketService: WebSocketService | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    autoReconnect = true,
    enablePollingFallback = true,
    onConnect,
    onDisconnect,
    onError
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [error, setError] = useState<Event | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      const currentTimeout = reconnectTimeoutRef.current
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
    }
  }, [])

  // Handle WebSocket messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (isMountedRef.current) {
      setLastMessage(message)
    }
  }, [])

  // Handle WebSocket connection
  const handleConnect = useCallback(() => {
    if (isMountedRef.current) {
      setIsConnected(true)
      setIsConnecting(false)
      setIsPolling(false)
      setError(null)
      onConnect?.()
    }
  }, [onConnect])

  // Handle WebSocket disconnection
  const handleDisconnect = useCallback(() => {
    if (isMountedRef.current) {
      setIsConnected(false)
      setIsConnecting(false)
      onDisconnect?.()
    }
  }, [onDisconnect])

  // Handle WebSocket errors
  const handleError = useCallback((error: Event) => {
    if (isMountedRef.current) {
      setError(error)
      setIsConnecting(false)
      onError?.(error)
    }
  }, [onError])

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!webSocketService) return

    webSocketService.onMessage(handleMessage)
    webSocketService.onClose(handleDisconnect)
    webSocketService.onError(handleError)

    return () => {
      // Cleanup is handled by the service itself
    }
  }, [webSocketService, handleMessage, handleDisconnect, handleError])

  // Polling fallback
  const startPolling = useCallback(() => {
    if (isPolling) return

    setIsPolling(true)
    console.log('Starting polling fallback')

    // This would need to be implemented based on your polling logic
    // For now, we'll just set the polling state
  }, [isPolling])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }, [])

  // Connect function
  const connect = useCallback(async () => {
    if (!webSocketService || isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    try {
      await webSocketService.connect()
      handleConnect()
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      handleError(error as Event)
      
      // Fallback to polling if enabled
      if (enablePollingFallback) {
        startPolling()
      }
    }
  }, [webSocketService, isConnecting, isConnected, enablePollingFallback, handleConnect, handleError, startPolling])

  // Disconnect function
  const disconnect = useCallback(() => {
    if (webSocketService) {
      webSocketService.disconnect()
    }
    stopPolling()
  }, [webSocketService, stopPolling])

  // Send function
  const send = useCallback((message: WebSocketMessage) => {
    if (webSocketService && isConnected) {
      webSocketService.send(message)
    }
  }, [webSocketService, isConnected])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && webSocketService && !isConnected && !isConnecting) {
      connect()
    }
  }, [autoConnect, webSocketService, isConnected, isConnecting, connect])

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (autoReconnect && !isConnected && !isConnecting && !isPolling && webSocketService) {
      const timeout = setTimeout(() => {
        if (isMountedRef.current) {
          connect()
        }
      }, 1000)

      return () => clearTimeout(timeout)
    }
  }, [autoReconnect, isConnected, isConnecting, isPolling, webSocketService, connect])

  return {
    isConnected,
    isConnecting,
    isPolling,
    connect,
    disconnect,
    send,
    lastMessage,
    error
  }
}
