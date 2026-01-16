import React, { useState, useEffect, useRef, useCallback } from 'react'
import Card from './Card'
import { useGame } from '../contexts/GameContext'
import TutorialModal from './TutorialModal'
import './GameTable.css'

// Types (copied from App.tsx for now - in a real app these would be in a shared types file)
type CardType = {
  value: string
  suit: string
}

type Player = {
  name: string
  hand: CardType[]
  is_cpu: boolean
  wallet: number
}

type GameState = {
  players: Player[]
  pot: CardType[]
  deck: CardType[]
  current_player: number
  has_drawn: boolean
  mode: string
  id: string
  max_players: number
  pot_amount: number
  entry_fee: number
  winner?: string
  winner_hand?: CardType[]
  game_over?: boolean
}

export interface GameTableProps {
  state: GameState
  playerName: string
  onDiscard: (index: number) => void
  onDraw: () => void
  loadingStates: {
    drawing: boolean
    discarding: boolean
    cpuMoving: boolean
  }
  playSound: (soundType: 'draw' | 'discard' | 'win' | 'button' | 'shuffle') => void
}

export const GameTable: React.FC<GameTableProps> = ({
  state,
  playerName,
  onDiscard,
  onDraw,
  loadingStates,
  playSound
}) => {
  const { isTutorial, tutorialStep, nextTutorialStep, setGuideVisible } = useGame();
  const tableRef = useRef<HTMLDivElement>(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [showDeckHighlight, setShowDeckHighlight] = useState(false)
  const [discardingCardIndex, setDiscardingCardIndex] = useState<number | null>(null)
  
  // Animation States
  const [animatingDiscard, setAnimatingDiscard] = useState<{
    card: CardType,
    style: React.CSSProperties
  } | null>(null)
  
  const [animatingDraw, setAnimatingDraw] = useState<{
    card: CardType,
    style: React.CSSProperties,
    playerName: string
  } | null>(null)

  const [isShuffling, setIsShuffling] = useState(false)
  const [dealingCards, setDealingCards] = useState<boolean[]>([])
  const [drawingCardIndex, setDrawingCardIndex] = useState<number | null>(null)

  // Case-insensitive player name matching to handle whitespace and case differences
  const playerNameToMatch = playerName?.trim().toLowerCase() || ''
  const yourPlayer = state.players.find((p) => {
    if (!p?.name) return false
    return p.name.trim().toLowerCase() === playerNameToMatch
  })
  const gameCurrentPlayerIndex = state.current_player ?? 0
  const currentPlayer = state.players[gameCurrentPlayerIndex]
  const isGameOver = state.game_over

  // All useEffect hooks must be called before any early returns
  // --- COORDINATE SYSTEM HELPER ---
  const getRelativePos = useCallback((element: Element) => {
    if (!tableRef.current) return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    const elRect = element.getBoundingClientRect();
    const tableRect = tableRef.current.getBoundingClientRect();

    return {
      x: elRect.left - tableRect.left,
      y: elRect.top - tableRect.top,
      width: elRect.width,
      height: elRect.height,
      centerX: (elRect.left - tableRect.left) + (elRect.width / 2),
      centerY: (elRect.top - tableRect.top) + (elRect.height / 2)
    };
  }, []);

  const currentPlayerIndex = state.players.findIndex((p) => {
    if (!p?.name) return false
    return p.name.trim().toLowerCase() === playerNameToMatch
  })

  const getSeatPlayers = () => {
    const players = state.players
    const currentIndex = currentPlayerIndex
    
    if (currentIndex === -1) return { top: null, left: null, right: null, bottom: null }
    
    const bottom = players[currentIndex]
    const otherPlayers = players.filter((_, index) => index !== currentIndex)
    
    return {
      top: otherPlayers[0] || null,
      left: otherPlayers[1] || null,
      right: otherPlayers[2] || null,
      bottom: bottom
    }
  }

  const seatPlayers = getSeatPlayers()

  const getSeatPos = useCallback((name: string) => {
    // Determine seat position by name
    if (seatPlayers.top?.name === name) return 'top'
    if (seatPlayers.left?.name === name) return 'left'
    if (seatPlayers.right?.name === name) return 'right'
    return 'bottom'
  }, [seatPlayers.top?.name, seatPlayers.left?.name, seatPlayers.right?.name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDeckHighlight(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Detect Opponent Draws
  const prevHandLengths = useRef<Record<string, number>>({})
  const prevYourHandLength = useRef(yourPlayer?.hand.length || 0)

  useEffect(() => {
    // 1. Clear discarding state when your hand changes
    const currentHandLength = yourPlayer?.hand.length || 0;
    if (currentHandLength !== prevYourHandLength.current) {
      setDiscardingCardIndex(null);
      setAnimatingDiscard(null);
      prevYourHandLength.current = currentHandLength;
    }

    // 2. Detect opponent draws
    state.players.forEach((player) => {
      if (player.name === playerName) return // Skip yourself, handleDraw does it
      
      const prevLength = prevHandLengths.current[player.name] ?? 0
      const currentLength = player.hand.length
      
      if (currentLength > prevLength && prevLength > 0) {
        // Opponent drew a card
        const deckEl = document.querySelector('.deck-area .card')
        const handEl = document.querySelector(`.player-seat.${getSeatPos(player.name)} .hand`)
        
        if (deckEl && handEl) {
          const startPos = getRelativePos(deckEl)
          // For opponents, we can just aim for the center of their hand
          const endPos = getRelativePos(handEl)
          
          setAnimatingDraw({
            card: { value: '', suit: '' }, // Handled as facedown in UI
            playerName: player.name,
            style: {
              left: `${startPos.x}px`,
              top: `${startPos.y}px`,
              width: `${startPos.width}px`,
              height: `${startPos.height}px`,
              '--dest-x': `${endPos.centerX - startPos.centerX}px`,
              '--dest-y': `${endPos.centerY - startPos.centerY}px`,
            } as React.CSSProperties
          })
          
          setTimeout(() => setAnimatingDraw(null), 1000)
        }
      }
      prevHandLengths.current[player.name] = currentLength
    })
  }, [state.players, playerName, getRelativePos, getSeatPos])

  useEffect(() => {
    if (state?.current_player !== state?.players.findIndex((p) => p?.name === playerName)) {
      setShowDeckHighlight(false)
      setSelectedCardIndex(null)
      setDiscardingCardIndex(null)
      setAnimatingDiscard(null)
      setAnimatingDraw(null)
      // setDrawingCard(false) // ⬅️ REMOVED
    }
  }, [state, playerName, yourPlayer?.hand.length])

  // Trigger shuffle animation at game start
  useEffect(() => {
    if (state && !isGameOver && state.deck.length > 0 && yourPlayer?.hand.length === 0) {
      setIsShuffling(true)
      playSound('shuffle')
      setTimeout(() => {
        setIsShuffling(false)
        // Start dealing animation after shuffle
        const handSize = yourPlayer?.hand.length || 0
        if (handSize > 0) {
          setDealingCards(new Array(handSize).fill(true))
          setTimeout(() => setDealingCards([]), handSize * 250 + 2200)
        }
      }, window.innerWidth <= 768 ? 2000 : 2000)
    }
  }, [state?.id, isGameOver, state, yourPlayer?.hand.length, playSound])

  // Early return after all hooks
  if (!yourPlayer || !currentPlayer) {
    console.error('[GameTable] Player data not available', {
      playerName,
      playerNameToMatch,
      playersInState: state.players.map(p => ({ name: p.name, nameLower: p.name.trim().toLowerCase() })),
      yourPlayerFound: !!yourPlayer,
      currentPlayerFound: !!currentPlayer,
      gameStateId: state.id,
      playersCount: state.players.length,
      maxPlayers: state.max_players
    })
    return (
      <div className="error" style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'white',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        margin: '20px'
      }}>
        <h3>Player data not available</h3>
        <p>Looking for: {playerName}</p>
        <p>Players in game: {state.players.map(p => p.name).join(', ')}</p>
        <p>Please wait while the game syncs...</p>
      </div>
    )
  }

  const isWinner = (player: Player) => isGameOver && state.winner === player.name

  const shouldShowPrompt = () => {
    const playerId = state.players[state.current_player]?.name
    // Show prompt when it's the player's turn and they haven't drawn yet
    return playerId === playerName && !state.has_drawn && !isGameOver
  }

  const promptClassName = `tutorial-prompt ${isTutorial && tutorialStep === 5 ? 'tutorial-blink' : ''}`

  // ⬇️ REPLACED: Updated handleCardClick for precise animation
  const handleCardClick = (index: number) => {
    if (selectedCardIndex === index) {
      const cardElement = document.querySelector(`[data-card-index="${index}"]`) as HTMLElement;
      
      // Find the destination element (the discard pile)
      const discardPileEl = document.querySelector('.discard-area .discard-top') 
                         || document.querySelector('.discard-area .discard-empty');

      if (cardElement && yourPlayer && discardPileEl) {
        const startPos = getRelativePos(cardElement);
        const endPos = getRelativePos(discardPileEl);

        const deltaX = endPos.centerX - startPos.centerX;
        const deltaY = endPos.centerY - startPos.centerY;
        
        const card = yourPlayer.hand[index];
        playSound('discard');
        
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        
        setAnimatingDiscard({
          card,
          style: {
            left: `${startPos.x}px`,
            top: `${startPos.y}px`,
            width: `${startPos.width}px`,
            height: `${startPos.height}px`,
            '--dest-x': `${deltaX}px`,
            '--dest-y': `${deltaY}px`,
            '--rotation': `${(Math.random() * 20) - 10}deg`
          } as React.CSSProperties
        });
        
        setDiscardingCardIndex(index);
        
        const animationDuration = window.innerWidth <= 768 ? 1200 : 800;
        setTimeout(() => {
          if (isTutorial && tutorialStep === 6) {
            nextTutorialStep();
          }
          
          onDiscard(index);
          // ⬇️ MODIFIED: We no longer clear discarding states here
          // This prevents the card from "flickering" back into the hand
          // before the backend state update arrives.
          // Safety fallback: Clear discarding state after 4 seconds 
          // if hand update doesn't arrive (prevents permanent hidden card)
          setTimeout(() => {
            setDiscardingCardIndex((prev: number | null) => prev === index ? null : prev);
            setAnimatingDiscard((prev: { card: CardType; style: React.CSSProperties } | null) => prev?.card === card ? null : prev);
          }, 4000);
        }, animationDuration);
      }
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(index);
      
      // Enhanced haptic feedback for card selection
      if (navigator.vibrate) {
        // Gentle vibration for selection
        navigator.vibrate([30, 20, 30]); // Gentle-short-gentle pattern
      }
    }
  }

  // ⬇️ REPLACED: Enhanced draw animation handling with overlay
  const handleDraw = () => {
    if (isTutorial && tutorialStep === 5) {
      nextTutorialStep();
      setGuideVisible(true);
    }
    playSound('draw');
    
    const deckEl = document.querySelector('.deck-area .card');
    if (!deckEl) {
      onDraw();
      return;
    }
    const startPos = getRelativePos(deckEl);

    const newCardIndex = yourPlayer.hand.length;
    setDrawingCardIndex(newCardIndex);

    onDraw();
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const handEl = document.querySelector('.player-seat.bottom .hand');
        if (!handEl) return;
        
        const handCards = handEl.querySelectorAll('.card');
        const newCardEl = handCards[handCards.length - 1] as HTMLElement;
        
        if (newCardEl) {
          const endPos = getRelativePos(newCardEl);
          
          setAnimatingDraw({
            card: { value: '', suit: '' }, // Facedown initially
            playerName: playerName,
            style: {
              left: `${startPos.x}px`,
              top: `${startPos.y}px`,
              width: `${startPos.width}px`,
              height: `${startPos.height}px`,
              '--dest-x': `${endPos.x - startPos.x}px`,
              '--dest-y': `${endPos.y - startPos.y}px`,
            } as React.CSSProperties
          });
        }
      });
    });
    
    const animationDuration = window.innerWidth <= 768 ? 1000 : 1000;
    setTimeout(() => {
      setAnimatingDraw(null);
      setDrawingCardIndex(null);
    }, animationDuration);
  }

  const canDraw = !loadingStates.drawing && currentPlayer.name === playerName && !isGameOver && !state.has_drawn

  return (
    <div className="poker-table" ref={tableRef}>
      {/* Screen reader announcements */}
      <div 
        id="game-announcements" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        {isGameOver && state.winner && `Game over! ${state.winner} wins!`}
        {!isGameOver && currentPlayer.name === playerName && !state.has_drawn && "It's your turn. Draw a card from the deck."}
        {!isGameOver && currentPlayer.name === playerName && state.has_drawn && "Select a card to discard."}
        {!isGameOver && currentPlayer.name !== playerName && `${currentPlayer.name} is playing.`}
      </div>
      
      {/* Top Player */}
      {seatPlayers.top && (
        <div 
          className={`player-seat top ${gameCurrentPlayerIndex === state.players.findIndex(p => p.name === seatPlayers.top?.name) ? "active" : ""}`}
          role="region"
          aria-label={`Player ${seatPlayers.top.name}${seatPlayers.top.is_cpu ? " (CPU)" : ""}${state.current_player === state.players.findIndex(p => p.name === seatPlayers.top?.name) ? ", current turn" : ""}`}
        >
          <div className="player-header">
            <h3>
              {seatPlayers.top.name}
              {seatPlayers.top.is_cpu && " (CPU)"}
            </h3>
            <span className="player-wallet">K{seatPlayers.top.wallet?.toLocaleString() ?? '10,000'}</span>
          </div>
          <div className="hand horizontal" aria-label={`${seatPlayers.top.name}'s hand with ${seatPlayers.top.hand.length} cards`}>
            {seatPlayers.top.hand.map((card, i) => {
              const isDrawingCard = animatingDraw?.playerName === seatPlayers.top?.name && i === seatPlayers.top.hand.length - 1;
              return (
                <Card
                  key={i}
                  facedown={!isGameOver}
                  value={card.value}
                  suit={card.suit}
                  small={true}
                  highlight={isWinner(seatPlayers.top)}
                  style={{ opacity: isDrawingCard ? 0 : 1 }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Left Player */}
      {seatPlayers.left && (
        <div 
          className={`player-seat left ${gameCurrentPlayerIndex === state.players.findIndex(p => p.name === seatPlayers.left?.name) ? "active" : ""}`}
          role="region"
          aria-label={`Player ${seatPlayers.left.name}${seatPlayers.left.is_cpu ? " (CPU)" : ""}${state.current_player === state.players.findIndex(p => p.name === seatPlayers.left?.name) ? ", current turn" : ""}`}
        >
          <div className="player-header">
            <h3>
              {seatPlayers.left.name}
              {seatPlayers.left.is_cpu && " (CPU)"}
            </h3>
            <span className="player-wallet">K{seatPlayers.left.wallet?.toLocaleString() ?? '10,000'}</span>
          </div>
          <div className="hand horizontal" aria-label={`${seatPlayers.left.name}'s hand with ${seatPlayers.left.hand.length} cards`}>
            {seatPlayers.left.hand.map((card, i) => {
              const isDrawingCard = animatingDraw?.playerName === seatPlayers.left?.name && i === seatPlayers.left.hand.length - 1;
              return (
                <Card
                  key={`left-${i}`}
                  facedown={!isGameOver}
                  value={card.value}
                  suit={card.suit}
                  small={true}
                  highlight={isWinner(seatPlayers.left)}
                  style={{ opacity: isDrawingCard ? 0 : 1 }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Right Player */}
      {seatPlayers.right && (
        <div 
          className={`player-seat right ${gameCurrentPlayerIndex === state.players.findIndex(p => p.name === seatPlayers.right?.name) ? "active" : ""}`}
          role="region"
          aria-label={`Player ${seatPlayers.right.name}${seatPlayers.right.is_cpu ? " (CPU)" : ""}${state.current_player === state.players.findIndex(p => p.name === seatPlayers.right?.name) ? ", current turn" : ""}`}
        >
          <div className="player-header">
            <h3>
              {seatPlayers.right.name}
              {seatPlayers.right.is_cpu && " (CPU)"}
            </h3>
            <span className="player-wallet">K{seatPlayers.right.wallet?.toLocaleString() ?? '10,000'}</span>
          </div>
          <div className="hand horizontal" aria-label={`${seatPlayers.right.name}'s hand with ${seatPlayers.right.hand.length} cards`}>
            {seatPlayers.right.hand.map((card, i) => {
              const isDrawingCard = animatingDraw?.playerName === seatPlayers.right?.name && i === seatPlayers.right.hand.length - 1;
              return (
                <Card
                  key={`right-${i}`}
                  facedown={!isGameOver}
                  value={card.value}
                  suit={card.suit}
                  small={true}
                  highlight={isWinner(seatPlayers.right)}
                  style={{ opacity: isDrawingCard ? 0 : 1 }}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="table-center">
        <div className="center-cards-area">
          <div
            className={`deck-area ${showDeckHighlight || (isTutorial && tutorialStep === 5) ? "deck-highlight" : ""} ${isTutorial && tutorialStep === 5 ? "tutorial-highlight" : ""} ${isShuffling ? "deck-shuffling" : ""}`}
            onClick={canDraw ? handleDraw : undefined}
            role="button"
            tabIndex={canDraw ? 0 : -1}
            aria-label={`Deck with ${state.deck?.length ?? 0} cards remaining${canDraw ? ", click to draw a card" : ""}`}
            onKeyDown={(e) => {
              if (canDraw && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                handleDraw()
              }
            }}
          >
            <div className="deck-count" aria-hidden="true">{state.deck?.length ?? 0}</div>
            {shouldShowPrompt() && <div className={promptClassName} role="status" aria-live="polite">Pick a card</div>}
            <Card
              facedown
              value=""
              suit=""
              className={`${isShuffling ? "card-shuffling" : ""}`}
              style={{
                cursor: canDraw ? "pointer" : "default",
              }}
            />
          </div>

          <div className="discard-area" role="region" aria-label="Discard pile">
            {state.pot?.length > 0 ? (
              <Card {...state.pot[state.pot.length - 1]} className="discard-top" />
            ) : (
              <div className="discard-empty" aria-label="Empty discard pile">Empty</div>
            )}
          </div>
        </div>

        <div className="pot-display-below">
           <div className="pot-container">
             <span className="pot-label">POT</span>
             <span className="pot-value">K{state.pot_amount.toLocaleString()}</span>
             <span className="pot-entry">Entry: K{state.entry_fee.toLocaleString()}</span>
           </div>
        </div>
      </div>

      {/* Bottom Player (current player) */}
      <div
        className={`player-seat bottom ${gameCurrentPlayerIndex === currentPlayerIndex ? "active" : ""}`}
        role="region"
        aria-label={`Your hand${state.current_player === currentPlayerIndex ? ", current turn" : ""}`}
      >
        <div className="player-header">
          <h4 className="player-name">{yourPlayer.name} (You)</h4>
          <span className="player-wallet">K{yourPlayer.wallet?.toLocaleString() ?? '10,000'}</span>
        </div>
        <div className="hand" aria-label={`Your hand with ${yourPlayer.hand?.length || 0} cards`}>
          {yourPlayer.hand?.map((card, i) => {
            const isDealing = dealingCards[i] || false
            const delayClass = isDealing ? `deal-delay-${Math.min(i + 1, 7)}` : ""
            const isDrawing = drawingCardIndex === i // Check if this is the card being drawn
            
            return (
              <Card
                key={`you-${i}`}
                {...card}
                onClick={() => handleCardClick(i)}
                disabled={
                  !state.has_drawn ||
                  currentPlayer.is_cpu ||
                  currentPlayer.name !== yourPlayer.name ||
                  loadingStates.discarding ||
                  discardingCardIndex !== null ||
                  isDealing ||
                  isDrawing
                }
                className={`${isDealing ? `card-dealing ${delayClass}` : ""} ${isDrawing ? "card-drawing" : ""} ${isTutorial && tutorialStep === 6 ? "tutorial-highlight" : ""}`}
                highlight={isWinner(yourPlayer)}
                selected={selectedCardIndex === i}
                style={{
                  opacity: (isDrawing && animatingDraw) || discardingCardIndex === i ? 0 : 1,
                  visibility: discardingCardIndex === i ? 'hidden' : 'visible',
                  transition: 'none'
                }}
                data-card-index={i}
              />
            )
          })}
        </div>
      </div>
      
      {/* Animated overlay card for discard effect */}
      {animatingDiscard && (
        <Card
          {...animatingDiscard.card}
          className="discard-animation-overlay"
          style={animatingDiscard.style}
        />
      )}
 
      {/* Animated overlay card for draw effect */}
      {animatingDraw && (
        <Card
          facedown={true}
          value=""
          suit=""
          className="draw-animation-overlay"
          style={animatingDraw.style}
        />
      )}
      
      <TutorialModal />
    </div>
  )
}

export default GameTable