import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import Modal from './Modal'
import './GameOverModal.css'

// Simple card display component for winning hand
const SimpleCard: React.FC<{ value: string; suit: string; highlight?: boolean }> = ({ 
  value, 
  suit, 
  highlight = false 
}) => {
  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black"
  
  return (
    <div 
      className={`simple-card ${suitColor} ${highlight ? "highlight-card" : ""}`}
      role="img"
      aria-label={`${value} of ${suit}`}
    >
      <div className="card-inner">
        <span className="card-value">{value}</span>
        <span className="card-suit">{suit}</span>
      </div>
    </div>
  )
}

export interface GameOverModalProps {
  isOpen: boolean
  onClose: () => void
  winner: string
  winnerHand?: Array<{ value: string; suit: string }>
  onNewGame: () => void
  winAmount?: string | number
  houseCut?: number
  winnerAmount?: number
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onClose,
  winner,
  winnerHand,
  onNewGame,
  winAmount,
  houseCut,
  winnerAmount
}) => {
  // Trigger confetti when modal opens
  useEffect(() => {
    if (isOpen) {
      // Fire confetti immediately
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 }

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min
      }

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        // Fire from two sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [isOpen])

  const handleNewGame = () => {
    onNewGame()
    onClose()
  }

  const formattedWinAmount = winAmount 
    ? typeof winAmount === 'number' 
      ? `K${winAmount}` 
      : winAmount 
    : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      closeButtonText="×"
      className="game-over-modal"
      contentClassName="game-over-content"
      announceOnOpen={true}
      announcementMessage={`Game over! ${winner} wins!${formattedWinAmount ? ` Prize: ${formattedWinAmount}` : ''}`}
    >
      <div className="game-over-message">
        {/* Winner Avatar/Icon */}
        <div className="winner-icon" aria-hidden="true">🏆</div>
        
        {/* Winner Name */}
        <h2 className="winner-name">{winner} Wins!</h2>
        
        {/* Win Amount */}
        {formattedWinAmount && (
          <div className="win-amount-container">
            <div className="win-amount" aria-label={`Prize: ${formattedWinAmount}`}>
              {formattedWinAmount}
            </div>
            {(houseCut !== undefined && winnerAmount !== undefined) && (
              <div className="win-breakdown">
                <div className="breakdown-item">
                  <span>Gross Pot:</span>
                  <span>K{winAmount}</span>
                </div>
                <div className="breakdown-item house-deduction">
                  <span>House Cut (10%):</span>
                  <span>-K{houseCut}</span>
                </div>
                <div className="breakdown-item net-win">
                  <span>Your Net Win:</span>
                  <span>K{winnerAmount}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Winning Hand */}
        {winnerHand && winnerHand.length > 0 && (
          <div className="winning-hand-section">
            <h4>Winning Hand</h4>
            <div 
              className="winning-hand" 
              role="img" 
              aria-label={`Winning hand: ${winnerHand.map(card => `${card.value} of ${card.suit}`).join(', ')}`}
            >
              {winnerHand.map((card, i) => (
                <SimpleCard
                  key={`winner-${i}`}
                  value={card.value}
                  suit={card.suit}
                  highlight={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="game-over-actions">
        <button 
          className="new-game-button"
          onClick={handleNewGame}
          autoFocus
          aria-label="Start a new game"
        >
          New Game
        </button>
        <button 
          className="quit-button"
          onClick={onClose}
          aria-label="Quit to main menu"
        >
          Quit
        </button>
      </div>
    </Modal>
  )
}

export default GameOverModal
