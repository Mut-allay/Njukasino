import { render, screen } from '@testing-library/react';
import { GameRoomPage } from '../GameRoomPage';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock hooks
vi.mock('../../contexts/GameContext');
vi.mock('../../contexts/AuthContext');

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ lobbyId: 'test-lobby' }),
  };
});

// Mock components to avoid lazy loading issues in tests
vi.mock('../../components/LazyGameTable', () => ({
  default: () => <div data-testid="game-table">Game Table</div>
}));
vi.mock('../../components/LazyGameOverModal', () => ({
  default: () => null
}));

describe('GameRoomPage Quorum Transition', () => {
  const mockPlaySound = vi.fn();

  // Define mocks here to avoid hoisting issues if possible, 
  // or use vi.mock outside with absolute paths.
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      currentUser: { uid: 'user-1' } as unknown as { uid: string },
      userData: { wallet_balance: 1000 } as unknown as { wallet_balance: number },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('shows the waiting overlay when lobby has not started', () => {
    vi.mocked(useGame).mockReturnValue({
      lobby: {
        id: 'test-lobby',
        started: false,
        players: ['Player 1'],
        max_players: 4,
        entry_fee: 100,
        host_uid: 'user-1',
      },
      gameState: null,
      loadingStates: {},
      gameService: { getLobbies: vi.fn(), getGame: vi.fn() },
    } as unknown as ReturnType<typeof useGame>);

    render(
      <MemoryRouter>
        <GameRoomPage playSound={mockPlaySound} />
      </MemoryRouter>
    );

    expect(screen.getByText('Waiting for Players')).toBeInTheDocument();
    expect(screen.getByText('1/4')).toBeInTheDocument();
  });

  it('removes the waiting overlay and unblurs the table when lobby starts', async () => {
    // Initial state: waiting
    const mockContext = {
      lobby: {
        id: 'test-lobby',
        started: false,
        players: ['P1', 'P2', 'P3', 'P4'],
        max_players: 4,
        entry_fee: 100,
        host_uid: 'user-1',
      },
      gameState: null,
      loadingStates: {},
      gameService: { getLobbies: vi.fn(), getGame: vi.fn() },
    };

    const { rerender } = render(
      <MemoryRouter>
        <GameRoomPage playSound={mockPlaySound} />
      </MemoryRouter>
    );

    expect(screen.getByText('Waiting for Players')).toBeInTheDocument();

    // Transition state: lobby started and gameState loaded
    vi.mocked(useGame).mockReturnValue({
      ...mockContext,
      lobby: { ...mockContext.lobby, started: true, game_id: 'game-123' },
      gameState: { id: 'game-123', players: [] },
      gameId: 'game-123',
    } as unknown as ReturnType<typeof useGame>);

    rerender(
      <MemoryRouter>
        <GameRoomPage playSound={mockPlaySound} />
      </MemoryRouter>
    );

    // Overlay should be gone (or not visible)
    expect(screen.queryByText('Waiting for Players')).not.toBeInTheDocument();
    // Game table should be present and not blurred (filter: none)
    const gameTableContainer = screen.getByTestId('game-table').parentElement;
    expect(gameTableContainer).toHaveStyle('filter: none');
  });
});
