import React, { useState } from 'react'

export interface CardProps {
  value: string
  suit: string
  onClick?: () => void
  disabled?: boolean
  facedown?: boolean
  className?: string
  highlight?: boolean
  small?: boolean
  style?: React.CSSProperties
  selected?: boolean
  [key: string]: unknown
}

// ⬇️ ADDED A COMPLETE MAP OF ALL CARD IMAGES ⬇️
const cardImageMap: { [key: string]: string } = {
  'A♠': 'https://i.ibb.co/7xkX3DBP/ace-of-spades2.png',
  'A♥': 'https://i.ibb.co/35B8BckQ/ace-of-hearts.png',
  'A♦': 'https://i.ibb.co/Q7vLKGzd/ace-of-diamonds.png',
  'A♣': 'https://i.ibb.co/vx789zqQ/ace-of-clubs.png',
  'K♠': 'https://i.ibb.co/398YspSR/king-of-spades2.png',
  'K♥': 'https://i.ibb.co/9kxNhK2k/king-of-hearts2.png',
  'K♦': 'https://i.ibb.co/tphVCgVN/king-of-diamonds2.png',
  'K♣': 'https://i.ibb.co/Jj8sbb7c/king-of-clubs2.png',
  'Q♠': 'https://i.ibb.co/Df4rqCWy/queen-of-spades2.png',
  'Q♥': 'https://i.ibb.co/7NkjSWQr/queen-of-hearts2.png',
  'Q♦': 'https://i.ibb.co/SwK6jMqx/queen-of-diamonds2.png',
  'Q♣': 'https://i.ibb.co/SwBy5qF7/queen-of-clubs2.png',
  'J♠': 'https://i.ibb.co/NdTVnL3k/jack-of-spades2.png',
  'J♥': 'https://i.ibb.co/PGQwd0Bx/jack-of-hearts2.png',
  'J♦': 'https://i.ibb.co/HL2JdQzN/jack-of-diamonds2.png',
  'J♣': 'https://i.ibb.co/SwC4DSyV/jack-of-clubs2.png',
  '10♠': 'https://i.ibb.co/Q3gTw393/10-of-spades.png',
  '10♥': 'https://i.ibb.co/ch0S4v6d/10-of-hearts.png',
  '10♦': 'https://i.ibb.co/rGhvXcQ0/10-of-diamonds.png',
  '10♣': 'https://i.ibb.co/27WWR0RC/10-of-clubs.png',
  '9♠': 'https://i.ibb.co/ynrRZpdf/9-of-spades.png',
  '9♥': 'https://i.ibb.co/VYjD94NT/9-of-hearts.png',
  '9♦': 'https://i.ibb.co/Z3C0k19/9-of-diamonds.png',
  '9♣': 'https://i.ibb.co/MyCtXBzK/9-of-clubs.png',
  '8♠': 'https://i.ibb.co/p6cMtzSL/8-of-spades.png',
  '8♥': 'https://i.ibb.co/DfMDbGs1/8-of-hearts.png',
  '8♦': 'https://i.ibb.co/PR1P7W3/8-of-diamonds.png',
  '8♣': 'https://i.ibb.co/DSNkX0V/8-of-clubs.png',
  '7♠': 'https://i.ibb.co/3YGzcP6B/7-of-spades.png',
  '7♥': 'https://i.ibb.co/RkMZCPg0/7-of-hearts.png',
  '7♦': 'https://i.ibb.co/PGBBLCjc/7-of-diamonds.png',
  '7♣': 'https://i.ibb.co/Zp9RgpJB/7-of-clubs.png',
  '6♠': 'https://i.ibb.co/hJrcyLRB/6-of-spades.png',
  '6♥': 'https://i.ibb.co/LzVt9rp5/6-of-hearts.png',
  '6♦': 'https://i.ibb.co/4RCGvb87/6-of-diamonds.png',
  '6♣': 'https://i.ibb.co/LDWSqJVh/6-of-clubs.png',
  '5♠': 'https://i.ibb.co/274Cy2FS/5-of-spades.png',
  '5♥': 'https://i.ibb.co/G4ksQ9nr/5-of-hearts.png',
  '5♦': 'https://i.ibb.co/tGHPrkB/5-of-diamonds.png',
  '5♣': 'https://i.ibb.co/RGs6VwSx/5-of-clubs.png',
  '4♠': 'https://i.ibb.co/Dg1727gc/4-of-spades.png',
  '4♥': 'https://i.ibb.co/3mYLwTcJ/4-of-hearts.png',
  '4♦': 'https://i.ibb.co/hxCkckC3/4-of-diamonds.png',
  '4♣': 'https://i.ibb.co/dZvG32N/4-of-clubs.png',
  '3♠': 'https://i.ibb.co/6R0gW7Z7/3-of-spades.png',
  '3♥': 'https://i.ibb.co/dw5fs4kS/3-of-hearts.png',
  '3♦': 'https://i.ibb.co/RpdFmS3X/3-of-diamonds.png',
  '3♣': 'https://i.ibb.co/v604KYky/3-of-clubs.png',
  '2♠': 'https://i.ibb.co/wrJhGjjf/2-of-spades.png',
  '2♥': 'https://i.ibb.co/vC7D20SR/2-of-hearts.png',
  '2♦': 'https://i.ibb.co/kgb1jzxT/2-of-diamonds.png',
  '2♣': 'https://i.ibb.co/xqF5KThJ/2-of-clubs.png'
};

export const Card = React.memo(function Card({
  value,
  suit,
  onClick,
  disabled,
  facedown = false,
  className = "",
  highlight = false,
  small = false,
  style = {},
  selected = false,
  ...props
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchStartTime, setTouchStartTime] = useState(0)

  // ⬇️ REFACTORED LOGIC TO USE THE MAP ⬇️
  const imageUrl = cardImageMap[value + suit];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchStartTime(Date.now())
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!onClick || disabled) return
    
    const touchEnd = e.changedTouches[0].clientX
    const touchDuration = Date.now() - touchStartTime
    const swipeDistance = Math.abs(touchStart - touchEnd)
    
    // Enhanced gesture detection
    if (swipeDistance > 30 || touchDuration < 200) {
      // Swipe detected or quick tap
      onClick()
      
      // 📱 Haptic feedback for gesture actions
      if (navigator.vibrate) {
        navigator.vibrate([40, 20, 40]) // Quick tap pattern
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!onClick || disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  if (facedown) {
    return (
      <div
        className={`card facedown ${className} ${small ? "small-card" : ""}`}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="img"
        aria-label="Facedown card"
        {...props}
      >
        <div className="card-back"></div>
      </div>
    )
  }

  const suitColor = suit === "♥" || suit === "♦" ? "red" : "black"
  const cardLabel = `${value} of ${suit}${selected ? ", selected" : ""}${highlight ? ", winning card" : ""}`
  
  return (
    <div
      className={`card ${suitColor} ${className} ${highlight ? "highlight-card" : ""} ${small ? "small-card" : ""} ${isHovered ? "card-hover" : ""} ${selected ? "card-selected" : ""}`}
      onClick={!disabled ? onClick : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyPress}
      style={disabled ? { opacity: 0.7, cursor: "not-allowed", ...style } : style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={cardLabel}
      aria-pressed={selected}
      aria-disabled={disabled}
      {...props}
    >
      <div className="card-inner">
        {imageUrl ? (
          <picture>
            <source srcSet={imageUrl.replace('.png', '.webp')} type="image/webp" />
            <source srcSet={imageUrl.replace('.png', '.avif')} type="image/avif" />
            <img 
              src={imageUrl}
              alt={`${value} of ${suit}`}
              className="card-face-image"
              loading="lazy"
              decoding="async"
            />
          </picture>
        ) : (
          <>
            <span className="card-value">{value}</span>
            <span className="card-suit">{suit}</span>
          </>
        )}
      </div>
    </div>
  )
})

export default Card
