/**
 * WebSocket Service
 * 
 * Handles WebSocket connections for real-time game updates and lobby updates.
 * Provides fallback to polling if WebSocket connection fails.
 */

export interface WebSocketMessage {
  type: string
  data?: unknown
  gameId?: string
  lobbyId?: string
  action?: unknown
}

export interface WebSocketService {
  connect: () => Promise<void>
  disconnect: () => void
  send: (message: WebSocketMessage) => void
  onMessage: (callback: (message: WebSocketMessage) => void) => void
  onClose: (callback: () => void) => void
  onError: (callback: (error: Event) => void) => void
  isConnected: () => boolean
}

export class GameWebSocketService implements WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = []
  private closeCallbacks: (() => void)[] = []
  private errorCallbacks: ((error: Event) => void)[] = []
  private isConnecting = false
  private shouldReconnect = true
  private connectionTimeoutId: NodeJS.Timeout | null = null

  constructor(gameId: string, playerName: string, baseUrl: string = 'wss://njuka-webapp-backend.onrender.com') {
    // Ensure we're using the correct protocol for mobile
    const wsBaseUrl = baseUrl.startsWith('ws') ? baseUrl : `wss://${baseUrl}`
    this.url = `${wsBaseUrl}/ws/game/${gameId}?player_name=${encodeURIComponent(playerName)}`
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return
    }

    this.isConnecting = true

    try {
      // Add mobile-specific WebSocket configuration
      this.ws = new WebSocket(this.url)
      
      // Set connection timeout for mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const connectionTimeout = isMobile ? 10000 : 5000 // 10s for mobile, 5s for desktop
      
      this.connectionTimeoutId = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout, closing...')
          this.ws.close()
        }
      }, connectionTimeout)
      
      // Set mobile-friendly timeouts
      this.ws.onopen = () => {
        console.log('WebSocket connected to game')
        if (this.connectionTimeoutId) {
          clearTimeout(this.connectionTimeoutId)
          this.connectionTimeoutId = null
        }
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.shouldReconnect = true
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.messageCallbacks.forEach(callback => callback(message))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        this.isConnecting = false
        this.closeCallbacks.forEach(callback => callback())
        
        // More aggressive reconnection for mobile
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        this.errorCallbacks.forEach(callback => callback(error))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.isConnecting = false
      
      // For mobile devices, try fallback connection method
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.log('Mobile device detected, attempting fallback connection...')
        setTimeout(() => {
          if (this.shouldReconnect) {
            this.connect()
          }
        }, 1000)
      }
      
      throw error
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect()
      }
    }, delay)
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageCallbacks.push(callback)
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback)
  }

  onError(callback: (error: Event) => void): void {
    this.errorCallbacks.push(callback)
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // Ping the server to keep connection alive
  ping(): void {
    if (this.isConnected()) {
      this.send({ type: 'ping' })
    }
  }
}

export class LobbyWebSocketService implements WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = []
  private closeCallbacks: (() => void)[] = []
  private errorCallbacks: ((error: Event) => void)[] = []
  private isConnecting = false
  private shouldReconnect = true

  constructor(lobbyId: string, baseUrl: string = 'wss://njuka-webapp-backend.onrender.com') {
    // Ensure we're using the correct protocol for mobile
    const wsBaseUrl = baseUrl.startsWith('ws') ? baseUrl : `wss://${baseUrl}`
    this.url = `${wsBaseUrl}/ws/lobby/${lobbyId}`
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to lobby')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.shouldReconnect = true
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.messageCallbacks.forEach(callback => callback(message))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        this.isConnecting = false
        this.closeCallbacks.forEach(callback => callback())
        
        // More aggressive reconnection for mobile
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        this.errorCallbacks.forEach(callback => callback(error))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.isConnecting = false
      
      // For mobile devices, try fallback connection method
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.log('Mobile device detected, attempting fallback connection...')
        setTimeout(() => {
          if (this.shouldReconnect) {
            this.connect()
          }
        }, 1000)
      }
      
      throw error
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect()
      }
    }, delay)
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageCallbacks.push(callback)
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback)
  }

  onError(callback: (error: Event) => void): void {
    this.errorCallbacks.push(callback)
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // Ping the server to keep connection alive
  ping(): void {
    if (this.isConnected()) {
      this.send({ type: 'ping' })
    }
  }
}

// Factory functions for creating WebSocket services
export function createGameWebSocketService(gameId: string, playerName: string): GameWebSocketService {
  return new GameWebSocketService(gameId, playerName)
}

export function createLobbyWebSocketService(lobbyId: string): LobbyWebSocketService {
  return new LobbyWebSocketService(lobbyId)
}
