import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { GameService } from '../gameService';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('http://localhost:8000/lobby/create', async ({ request }) => {
    const body = await request.json() as { host: string; max_players: number; entry_fee: number };
    return HttpResponse.json({
      id: 'test-lobby-id',
      host: body.host,
      players: [body.host],
      max_players: body.max_players,
      entry_fee: body.entry_fee,
      game_id: 'test-game-id',
      started: false,
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('GameService', () => {
  const gameService = new GameService();

  test('createLobby calls the correct endpoint and returns lobby data', async () => {
    const lobby = await gameService.createLobby('Test Player', 'uid-123', 4, 100);
    
    expect(lobby.id).toBe('test-lobby-id');
    expect(lobby.host).toBe('Test Player');
    expect(lobby.entry_fee).toBe(100);
  });
});
