// cypress/e2e/game-loop.cy.ts

describe('Full Multiplayer Gameplay Loop', () => {
  let gameId: string;
  const botUids = ['bot_1_uid', 'bot_2_uid', 'bot_3_uid'];
  const botNames = ['Bot_1', 'Bot_2', 'Bot_3'];

  beforeEach(() => {
    // 1. Signup/Login Hero
    cy.signupAndLoginTestUser();
    
    // 2. Seed Bots in Firestore
    cy.request('POST', 'http://localhost:8000/simulation/seed-bots');
  });

  it('plays a full game until a winner is declared', () => {
    // 3. Create Lobby
    cy.visit('/multiplayer');
    cy.get('[data-testid="create-lobby-btn"]').click();
    
    // 4. Capture Game ID from URL
    cy.url().should('include', '/lobby/');
    cy.url().then((url) => {
      // The lobby ID is in the URL, but the game triggers auto-start 
      // when 4 players are in. We need to join the bots.
      const lobbyId = url.split('/lobby/')[1];
      
      // 5. Join 3 bots via API
      botUids.forEach((uid, index) => {
        cy.request('POST', `http://localhost:8000/lobby/${lobbyId}/join`, {
          player: botNames[index],
          player_uid: uid
        });
      });

      // 6. Wait for game to start and redirect to game view
      cy.url().should('include', '/lobby/'); // It might stay on lobby or redirect
      // In this app, GameRoomPage handles both.
      
      // Wait for table to be visible (unblurred)
      cy.get('[data-testid="game-table"]', { timeout: 10000 }).should('be.visible');

      // Extract Game ID from the UI or state if possible, or just use the one we can find
      // Actually, we don't need the gameId if we just use the current player logic on backend.
      // But we do need it for the POST requests.
      // Let's get it from the game service call interception.
      cy.intercept('GET', '**/game/**').as('getGame');
      cy.wait('@getGame').then((interception) => {
        gameId = interception.response.body.id;
        
        // 7. Start Game Loop
        playTurns();
      });
    });
  });

  function playTurns() {
    // Check if game is over
    cy.get('body').then(($body) => {
      if ($body.find('.game-over-modal').length > 0 || $body.find('[data-testid="game-over-modal"]').length > 0) {
        cy.log('Game Over detected!');
        return;
      }

      // Detect whose turn it is
      cy.get('.player-seat.active').then(($activeSeat) => {
        const playerName = $activeSeat.find('.player-name').text();
        cy.log(`Current Turn: ${playerName}`);

        if (playerName.includes('(You)')) {
          // HERO TURN
          cy.log('Hero is playing...');
          
          // 1. Draw
          cy.get('.deck-area').click();
          cy.wait(1000); // Wait for animation

          // 2. Discard (just discard the first card for simplicity)
          cy.get('[data-testid="player-card"]').first().click(); // Select
          cy.get('[data-testid="player-card"]').first().click(); // Discard (double click/confirm)
          
          cy.wait(2000); // Wait for discard and turn change
          playTurns(); // Recursive call
        } else {
          // BOT TURN
          cy.log(`Bot ${playerName} is playing via API...`);
          
          // 1. Bot Draw via API
          cy.request('POST', `http://localhost:8000/game/${gameId}/draw`).then(() => {
            cy.wait(500);
            // 2. Bot Discard first card via API
            cy.request('POST', `http://localhost:8000/game/${gameId}/discard?card_index=0`).then(() => {
              cy.wait(2000); // Wait for frontend to sync
              playTurns(); // Recursive call
            });
          });
        }
      });
    });
  }
});
