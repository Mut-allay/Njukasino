import { ArrowLeft, RefreshCw, Plus, Users as UsersIcon, Coins } from 'lucide-react';
import type { LobbyGame, LoadingStates } from '../types/game';
import { SelectionChips } from './SelectionChips';

interface MultiplayerPageProps {
  onBack: () => void;
  playerName: string;
  numPlayers: number;
  setNumPlayers: (num: number) => void;
  entryFee: number;
  setEntryFee: (fee: number) => void;
  onCreateLobby: () => void;
  onJoinLobby: (lobbyId: string) => void;
  lobbies: LobbyGame[];
  loadingStates: LoadingStates;
  onRefreshLobbies: () => void;
}

export const MultiplayerPage = ({ 
  onBack, 
  playerName, 
  numPlayers, 
  setNumPlayers,
  entryFee,
  setEntryFee,
  onCreateLobby,
  onJoinLobby,
  lobbies,
  loadingStates,
  onRefreshLobbies
}: MultiplayerPageProps) => {

  const playerOptions = [
    { label: '2 Players', value: 2 },
    { label: '3 Players', value: 3 },
    { label: '4 Players', value: 4 },
  ];

  const feeOptions = [
    { label: 'K100', value: 100, icon: <Coins size={14} /> },
    { label: 'K500', value: 500, icon: <Coins size={14} /> },
    { label: 'K1,000', value: 1000, icon: <Coins size={16} /> },
    { label: 'K5,000', value: 5000, icon: <Coins size={18} /> },
  ];

  return (
    <div className="page-container multiplayer-page">
      <div className="page-header">
        <div className="header-top">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back
          </button>
          <h2>Multiplayer</h2>
        </div>
      </div>

      <div className="multiplayer-content">
        <div className="create-lobby-section">
          <h3>Create New Game</h3>
          
          <SelectionChips 
            label="Max Players"
            options={playerOptions}
            selectedValue={numPlayers}
            onChange={setNumPlayers}
          />

          <SelectionChips 
            label="Entry Fee"
            options={feeOptions}
            selectedValue={entryFee}
            onChange={setEntryFee}
          />

          <div className="custom-amount-container">
            <label className="selection-label">AMOUNT (ZMW)</label>
            <div className="custom-amount-input-wrapper">
              <span className="amount-prefix">$</span>
              <input
                type="number"
                value={entryFee || 0}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className="custom-amount-input"
                placeholder="0"
                min="0"
              />
              <span className="amount-suffix">K</span>
            </div>
          </div>

          <button
            onClick={onCreateLobby}
            disabled={loadingStates.starting || !playerName.trim()}
            className="create-lobby-btn premium-btn"
          >
            {loadingStates.starting ? "Creating..." : "Create New Game"}
          </button>
        </div>

        <div className="join-lobby-section">
          <div className="lobby-header">
            <h3>Available Lobbies</h3>
            <button onClick={onRefreshLobbies} className="refresh-btn">
              <RefreshCw size={18} className={loadingStates.starting ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
          
          <div className="lobby-list">
            {!lobbies || lobbies.length === 0 ? (
              <div className="no-lobbies">
                <p>No games available right now.</p>
                <p>Create a new game to start playing!</p>
              </div>
            ) : (
              lobbies.map((lobby) => (
                <div key={lobby.id} className="lobby-item premium-card">
                  <div className="lobby-info">
                    <div className="host-row">
                      <div className="host-avatar">
                        {(lobby.host || 'P')[0].toUpperCase()}
                      </div>
                      <h4>Host: {lobby.host}</h4>
                    </div>
                    <p className="lobby-stats">
                      <UsersIcon size={14} /> 
                      <span>{lobby.players?.length || 0} / {lobby.max_players} Players</span>
                      <span className="fee-badge">K{lobby.entry_fee || 0}</span>
                    </p>
                    <div className="player-list-preview">
                      {(lobby.players || []).map((player) => (
                        <span key={player} className={`player-tag ${player === lobby.host ? 'host' : ''}`}>
                          {player === lobby.host && "👑 "}
                          {player}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onJoinLobby(lobby.id)}
                    disabled={(lobby.players?.length || 0) >= lobby.max_players || loadingStates.joining}
                    className="join-lobby-btn"
                  >
                    {loadingStates.joining ? "Joining..." : "Join Game"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button for creating lobby on mobile */}
      <button 
        className="fab-button" 
        onClick={onCreateLobby}
        disabled={loadingStates.starting || !playerName.trim()}
        title="Create New Game"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};
