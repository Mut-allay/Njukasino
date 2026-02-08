import '@testing-library/jest-dom';

// Mock WebSockets
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  readyState = 1; // OPEN

  send(data: string) {
    console.log('MockWS Send:', data);
  }
  close() {
    if (this.onclose) this.onclose();
  }
}

(global as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;

// Vitest handles import.meta.env naturally if configured with vite plugins,
// but we can provide defaults here if needed.
if (!import.meta.env) {
    (import.meta as unknown as { env: unknown }).env = {
        VITE_API_URL: 'http://localhost:8000',
    };
}
