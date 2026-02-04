export type UserProfile = {
  id: string;
  name?: string;
  email?: string;
};

export type CardType = {
  value: string;
  suit: string;
};

export type Player = {
  name: string;
  hand: CardType[];
  is_cpu: boolean;
  wallet: number;
};

export type GameState = {
  players: Player[];
  pot: CardType[];
  deck: CardType[];
  current_player: number;
  has_drawn: boolean;
  mode: string;
  id: string;
  max_players: number;
  pot_amount: number;
  entry_fee: number;
  winner?: string;
  winner_hand?: CardType[];
  game_over?: boolean;
  any_player_has_drawn?: boolean;
  winner_amount?: number;
  house_cut?: number;
};

export type LobbyGame = {
  id: string;
  host: string;
  players: string[];
  max_players: number;
  created_at: string;
  started?: boolean;
  game_id?: string;
  entry_fee: number;
  host_uid: string;
  player_uids: string[];
};

export type LoadingStates = {
  starting: boolean;
  joining: boolean;
  drawing: boolean;
  discarding: boolean;
  cpuMoving: boolean;
};