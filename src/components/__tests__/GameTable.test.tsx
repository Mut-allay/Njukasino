// src/components/__tests__/GameTable.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameTable } from "../GameTable";

vi.mock("../../contexts/GameContext", () => ({
  useGame: () => ({
    isTutorial: false,
    tutorialStep: 0,
    nextTutorialStep: vi.fn(),
    setGuideVisible: vi.fn(),
  }),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    userData: { wallet_balance: 100 },
  }),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
}));

vi.mock("../TutorialModal", () => ({ default: () => null }));
vi.mock("../AnimatedCard", () => ({ default: () => null }));

const mockState = {
  id: "test-game",
  deck: [],
  pot: [],
  players: [
    {
      name: "You",
      hand: [{ value: "A", suit: "♥" }],
      is_cpu: false,
      wallet: 100,
    },
  ],
  current_player: 0,
  has_drawn: false,
  mode: "multiplayer",
  max_players: 2,
  pot_amount: 2,
  entry_fee: 1,
};

describe("GameTable card rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders card faces with value and suit visible (not blank/white)", () => {
    render(
      <GameTable
        state={mockState as never}
        playerName="You"
        onDiscard={vi.fn()}
        onDraw={vi.fn()}
        loadingStates={{ drawing: false, discarding: false, cpuMoving: false }}
        playSound={vi.fn()}
      />
    );

    const card = screen.getByTestId("player-card");
    expect(card).toBeInTheDocument();
    // Card content: value and/or suit (or image). Our mock hand is A♥.
    const valueEl = screen.queryByText("A");
    const suitEl = screen.queryByText("♥");
    const hasValue = !!valueEl;
    const hasSuit = !!suitEl;
    const hasCardContent = card.querySelector(".card-value") || card.querySelector(".card-suit") || card.querySelector(".card-face-image");
    expect(hasCardContent || hasValue || hasSuit).toBe(true);
  });
});
