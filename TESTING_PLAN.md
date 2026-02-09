# Njukasino Testing Overview & Future Roadmap

This document summarizes the tests created during this session and outlines the recommended next steps for the project's testing infrastructure.

## 🏁 Summary of Created Tests

We have established a robust testing foundation across three critical layers:

### 1. Backend: Core Logic & API

- **Tooling**: `pytest`
- **Tests Created**:
  - `test_game_logic.py`: Validates winning combinations (Pairs, Consecutive, Mix) and the 90/10 pot distribution logic.
  - `test_api.py`: Ensures lobby creation and joining endpoints work correctly.
- **Why?**: Guaranteed financial integrity and game fairness at the source.

### 2. Frontend: Component & Logic Persistence

- **Tooling**: `Vitest` + `React Testing Library`
- **Tests Created**:
  - `gameService.test.ts`: mocks the API to verify data fetching.
  - `GameRoomPage.test.tsx`:
    - **Quorum Routing**: Verifies the table unblurs when players join.
    - **Refresh Persistence**: Verifies the UI re-syncs state from URL params on mount.
- **Why?**: Ensures the UI always reflects the correct game state, even after a page refresh.

### 3. End-to-End: User Flows

- **Tooling**: `Cypress`
- **Tests Created**:
  - `multiplayer_join.cy.ts`: Covers the lobby-to-game transition.
  - `page-refresh-persistence.cy.ts`: Covers the UI persistence after a browser reload.
- **Why?**: Validates the entire application working together in a real browser environment.

---

## 🚀 Proposing Next Steps (The Plan)

Based on the current progress, here is the recommended plan to reach full production stability:

### Phase 1: Full Gameplay Automation (High Priority)

- **What**: Create an E2E test that plays a full round (Draw -> Pick -> Win).
- **How**: Mock WebSocket messages to simulate 3 other players' moves.
- **Goal**: Ensure the game doesn't hang at any step of the turn cycle.

### Phase 2: Wallet & Transaction Safety

- **What**: Add "Fuzzing" tests for deposits and withdrawals.
- **How**: Simulate concurrent transactions and Verify Firestore atomic consistency.
- **Goal**: Absolute zero-tolerance for balance discrepancies.

### Phase 3: CI/CD Pipeline

- **What**: Integrate tests into a GitHub Action.
- **How**: Every PR runs `pytest`, `npm test`, and `npm run lint`.
- **Goal**: Prevent bugs from ever reaching the main branch.

---

## 🛠️ How to Run

- **Run all layers**: Execute global workflow via `/run-tests`.
- **Backend Only**: `cd backend/njuka-webapp-backend; pytest`
- **Frontend Only**: `npm test`
- **E2E Only**: `npx cypress run`
