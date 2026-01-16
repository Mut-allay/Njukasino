# Sound Effects for Njuka Card Game

This directory contains sound effects for the card game. The game will automatically look for these files:

## Required Sound Files:

1. **draw.mp3** / **draw.wav** - Sound when drawing a card from deck
2. **discard.mp3** / **discard.wav** - Sound when discarding a card
3. **shuffle.mp3** / **shuffle.wav** - Sound when shuffling deck at game start
4. **win.mp3** / **win.wav** - Sound when a player wins
5. **button.mp3** / **button.wav** - Sound for button clicks

## How to Add Sounds:

1. Find or create short audio files (0.5-2 seconds each)
2. Save them in MP3 or WAV format
3. Place them in this `/public/sounds/` directory
4. The game will automatically use them

## Recommended Sound Types:

- **Draw**: Light bell, chime, or card flip sound
- **Discard**: Swoosh, card slide, or paper rustle
- **Shuffle**: Card shuffling, paper rustling
- **Win**: Victory chime, fanfare, or celebration sound
- **Button**: Click, tap, or UI beep

## Fallback:

If sound files are missing, the game will still work but without audio effects. Check the browser console for any loading errors.

## Volume Levels:

The game automatically sets appropriate volume levels:

- Draw: 30%
- Discard: 40%
- Win: 50%
- Button: 20%
- Shuffle: 30%
