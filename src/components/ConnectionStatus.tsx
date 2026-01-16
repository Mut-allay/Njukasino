/**
 * Connection Status Component
 * 
 * Displays WebSocket connection status and provides connection controls.
 */

import { useWebSocketContext } from '../contexts/WebSocketContext'
import './ConnectionStatus.css'

export interface ConnectionStatusProps {
  /** Whether to show connection controls */
  showControls?: boolean
  /** Whether to show detailed status */
  showDetails?: boolean
  /** Custom className */
  className?: string
}

export function ConnectionStatus({ 
  showControls = false, 
  showDetails = false,
  className = '' 
}: ConnectionStatusProps) {
  const { 
    gameConnection, 
    lobbyConnection, 
    isAnyConnected, 
    isAnyConnecting 
  } = useWebSocketContext()

  const getStatusText = () => {
    if (isAnyConnecting) return 'Connecting...'
    if (isAnyConnected) return 'Connected'
    return 'Disconnected'
  }

  const getStatusClass = () => {
    if (isAnyConnecting) return 'connecting'
    if (isAnyConnected) return 'connected'
    return 'disconnected'
  }

  const handleReconnect = () => {
    if (gameConnection.isConnected) {
      gameConnection.disconnect()
    }
    if (lobbyConnection.isConnected) {
      lobbyConnection.disconnect()
    }
    // Reconnection will happen automatically due to autoReconnect
  }

  return (
    <div className={`connection-status ${className}`}>
      <div className={`status-indicator ${getStatusClass()}`}>
        <div className="status-dot" />
        <span className="status-text">{getStatusText()}</span>
      </div>
      
      {showDetails && (
        <div className="connection-details">
          <div className="connection-item">
            <span className="connection-label">Game:</span>
            <span className={`connection-value ${gameConnection.isConnected ? 'connected' : 'disconnected'}`}>
              {gameConnection.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="connection-item">
            <span className="connection-label">Lobby:</span>
            <span className={`connection-value ${lobbyConnection.isConnected ? 'connected' : 'disconnected'}`}>
              {lobbyConnection.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      )}
      
      {showControls && (
        <div className="connection-controls">
          <button 
            onClick={handleReconnect}
            disabled={isAnyConnecting}
            className="reconnect-button"
          >
            Reconnect
          </button>
        </div>
      )}
    </div>
  )
}
