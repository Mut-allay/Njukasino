from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import List, Dict, Optional, Set
import uuid
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import logging
import json
import os
from os import getenv
from dotenv import load_dotenv

# Load environment variables: try cwd first, then project root
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# Add current directory to Python path for imports to work from any location
import sys
sys.path.insert(0, os.path.dirname(__file__))

# Import payments router (must be after sys.path)
from routers.payments import router as payments_router

# Firebase Admin SDK imports
from firebase_admin import credentials, firestore, initialize_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ====================== FIREBASE INITIALIZATION ======================
try:
    firebase_service_account_json = getenv("FIREBASE_SERVICE_ACCOUNT")
    if not firebase_service_account_json:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT not set in .env")
    
    cred = credentials.Certificate(json.loads(firebase_service_account_json))
    initialize_app(cred)
    db = firestore.client()
    logger.info("✅ Firebase Admin SDK initialized successfully")
except Exception as e:
    logger.error("❌ Firebase init failed: %s", e)
    # Continue without Firebase if needed - but payments will fail

app = FastAPI()

# Add CORS for frontend (adjust origins for live)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://njukasino.vercel.app", "*"],  # Add your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================== MOUNT THE PAYMENTS ROUTER ======================
# This is the missing line - adds all /api/payments/... routes
app.include_router(payments_router, prefix="/api/payments")

# Rest of your original main.py code below (game logic, etc.)
# (I truncated the original, but paste the rest here in your file)

suits = ['♠', '♥', '♦', '♣']
values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

class Card(BaseModel):
    value: str
    suit: str

class Player(BaseModel):
    name: str
    uid: str = ""
    hand: List[Card]
    is_cpu: bool = False

class GameState(BaseModel):
    deck: List[Card]
    pot: List[Card]
    players: List[Player]
    current_player: int
    has_drawn: bool
    id: str
    mode: str
    max_players: int
    winner: str = ""
    winner_hand: List[Card] = []
    game_over: bool = False
    entry_fee: int = 0
    pot_amount: int = 0

class LobbyGame(BaseModel):
    id: str
    host: str
    players: List[str]
    max_players: int
    created_at: datetime
    started: bool = False
    last_updated: datetime
    game_id: Optional[str] = None
    entry_fee: int = 0
    host_uid: str = ""
    player_uids: List[str] = []

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}

    def dict(self, **kwargs):
        data = super().dict(**kwargs)
        data["created_at"] = self.created_at.isoformat()
        data["last_updated"] = self.last_updated.isoformat()
        return data


active_games: Dict[str, GameState] = {}
active_lobbies: Dict[str, LobbyGame] = {}

class ConnectionManager:
    def __init__(self):
        self.game_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.lobby_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_to_game(self, ws: WebSocket, game_id: str, player_name: str):
        await ws.accept()
        if game_id not in self.game_connections:
            self.game_connections[game_id] = {}
        self.game_connections[game_id][player_name] = ws

    async def connect_to_lobby(self, ws: WebSocket, lobby_id: str):
        await ws.accept()
        if lobby_id not in self.lobby_connections:
            self.lobby_connections[lobby_id] = set()
        self.lobby_connections[lobby_id].add(ws)

    def disconnect_from_game(self, game_id: str, player_name: str):
        if game_id in self.game_connections and player_name in self.game_connections[game_id]:
            del self.game_connections[game_id][player_name]
            if not self.game_connections[game_id]:
                del self.game_connections[game_id]

    def disconnect_from_lobby(self, ws: WebSocket, lobby_id: str):
        if lobby_id in self.lobby_connections:
            self.lobby_connections[lobby_id].discard(ws)
            if not self.lobby_connections[lobby_id]:
                del self.lobby_connections[lobby_id]

    async def broadcast_game_update(self, game_id: str, game_state: GameState):
        if game_id not in self.game_connections:
            return
        message = json.dumps({"type": "game_update", "data": game_state.dict()})
        disconnected = []
        for player_name, ws in self.game_connections[game_id].items():
            try:
                await ws.send_text(message)
            except:
                disconnected.append(player_name)
        for pn in disconnected:
            self.disconnect_from_game(game_id, pn)

    async def broadcast_lobby_update(self, lobby_id: str, lobby: LobbyGame):
        if lobby_id not in self.lobby_connections:
            return
        message = json.dumps({"type": "lobby_update", "data": lobby.dict()})
        disconnected = []
        for ws in self.lobby_connections[lobby_id]:
            try:
                await ws.send_text(message)
            except:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect_from_lobby(ws, lobby_id)

manager = ConnectionManager()

def create_deck() -> List[Card]:
    return [Card(value=v, suit=s) for s in suits for v in values]

def new_game_state(mode: str, player_name: str, player_uid: str = "", cpu_count: int = 1, max_players: int = 4, entry_fee: int = 0) -> GameState:
    deck = create_deck()
    random.shuffle(deck)
    players = []

    if mode == "tutorial":
        # Tutorial uses 1 CPU for demo, no entry fee
        players.append(Player(name=player_name, uid=player_uid, hand=[]))
        players.append(Player(name="CPU Demo", uid="cpu_demo", hand=[], is_cpu=True))
    else:  # multiplayer
        players.append(Player(name=player_name, uid=player_uid, hand=[]))

    # Deal 3 cards to each player
    for _ in range(3):
        for player in players:
            if deck:
                player.hand.append(deck.pop())

    starting_player = random.randint(0, len(players) - 1)

    return GameState(
        deck=deck,
        pot=[],
        players=players,
        current_player=starting_player,
        has_drawn=False,
        id=str(uuid.uuid4()),
        mode=mode,
        max_players=max_players,
        entry_fee=entry_fee,
        pot_amount=0
    )

# ====================== REQUEST MODELS ======================
class CreateLobbyRequest(BaseModel):
    host: str
    host_uid: str
    max_players: int = 4
    entry_fee: int = 0

class JoinLobbyRequest(BaseModel):
    player: str
    player_uid: str

# ====================== ROUTES ======================

@app.post("/lobby/create")
async def create_lobby(request: CreateLobbyRequest):
    if not (2 <= request.max_players <= 8):
        raise HTTPException(status_code=400, detail="Max players must be 2-8")
    if request.entry_fee < 0:
        raise HTTPException(status_code=400, detail="Entry fee cannot be negative")

    # Deduct entry fee from host's wallet if entry_fee > 0
    if request.entry_fee > 0:
        try:
            # Get user document using host_uid (more reliable than host name)
            user_ref = db.collection('users').document(request.host_uid)
            user_doc = user_ref.get()
            if not user_doc.exists:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_data = user_doc.to_dict()
            current_balance = user_data.get('wallet_balance', 0)
            
            if current_balance < request.entry_fee:
                raise HTTPException(status_code=400, detail="Insufficient balance")
            
            # Deduct entry fee using transaction
            @firestore.transactional
            def deduct_fee(transaction):
                user_snapshot = user_ref.get(transaction=transaction)
                if not user_snapshot.exists:
                    raise HTTPException(status_code=404, detail="User not found")
                
                user_data = user_snapshot.to_dict()
                balance = user_data.get('wallet_balance', 0)
                if balance < request.entry_fee:
                    raise HTTPException(status_code=400, detail="Insufficient balance")
                
                transaction.update(user_ref, {
                    'wallet_balance': balance - request.entry_fee
                })
                return balance - request.entry_fee
            
            new_balance = deduct_fee(db.transaction())
            logger.info(f"Deducted {request.entry_fee} from {request.host_uid}, new balance: {new_balance}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to deduct entry fee from {request.host_uid}: {e}")
            raise HTTPException(status_code=500, detail="Failed to process payment")

    lobby_id = str(uuid.uuid4())
    lobby = LobbyGame(
        id=lobby_id,
        host=request.host,
        host_uid=request.host_uid,
        players=[request.host],
        player_uids=[request.host_uid],
        max_players=request.max_players,
        entry_fee=request.entry_fee,
        created_at=datetime.now(),
        last_updated=datetime.now()
    )
    active_lobbies[lobby_id] = lobby
    logger.info(f"Lobby created: {lobby_id} by {request.host} with entry fee {request.entry_fee}")
    return lobby.dict()

@app.post("/lobby/{lobby_id}/join")
async def join_lobby(lobby_id: str, request: JoinLobbyRequest):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")

    lobby = active_lobbies[lobby_id]
    player_name = request.player

    if len(lobby.players) >= lobby.max_players:
        raise HTTPException(status_code=400, detail="Lobby is full")

    if player_name in lobby.players:
        raise HTTPException(status_code=400, detail="Player already in lobby")

    # Deduct entry fee from joining player's wallet if entry_fee > 0
    if lobby.entry_fee > 0:
        try:
            # Get user document using player_uid
            user_ref = db.collection('users').document(request.player_uid)
            user_doc = user_ref.get()
            if not user_doc.exists:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_data = user_doc.to_dict()
            current_balance = user_data.get('wallet_balance', 0)
            
            if current_balance < lobby.entry_fee:
                raise HTTPException(status_code=400, detail="Insufficient balance")
            
            # Deduct entry fee using transaction
            @firestore.transactional
            def deduct_fee(transaction):
                user_snapshot = user_ref.get(transaction=transaction)
                if not user_snapshot.exists:
                    raise HTTPException(status_code=404, detail="User not found")
                
                user_data = user_snapshot.to_dict()
                balance = user_data.get('wallet_balance', 0)
                if balance < lobby.entry_fee:
                    raise HTTPException(status_code=400, detail="Insufficient balance")
                
                transaction.update(user_ref, {
                    'wallet_balance': balance - lobby.entry_fee
                })
                return balance - lobby.entry_fee
            
            new_balance = deduct_fee(db.transaction())
            logger.info(f"Deducted {lobby.entry_fee} from {request.player_uid}, new balance: {new_balance}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to deduct entry fee from {request.player_uid}: {e}")
            raise HTTPException(status_code=500, detail="Failed to process payment")

    # CRITICAL FIX: Create game when second player joins
    if len(lobby.players) == 1:  # This is the second player → start the game!
        game_state = new_game_state("multiplayer", lobby.host, player_uid=lobby.host_uid, max_players=lobby.max_players, entry_fee=lobby.entry_fee)
        active_games[game_state.id] = game_state

        # Add joining player to the game with 3 cards
        game_state.players.append(Player(name=player_name, uid=request.player_uid, hand=[]))
        for _ in range(3):
            if game_state.deck:
                game_state.players[-1].hand.append(game_state.deck.pop())

        # Update pot_amount with entry fees from both players
        game_state.pot_amount = lobby.entry_fee * 2
    elif len(lobby.players) > 1 and lobby.game_id:
        # Subsequent players joining an already started lobby (if max_players > 2)
        game_state = active_games.get(lobby.game_id)
        if game_state:
            game_state.players.append(Player(name=player_name, uid=request.player_uid, hand=[]))
            for _ in range(3):
                if game_state.deck:
                    game_state.players[-1].hand.append(game_state.deck.pop())
            # Increment pot for subsequent players
            game_state.pot_amount += lobby.entry_fee

    # THIS WAS THE MISSING LINE THAT BROKE EVERYTHING
    if len(lobby.players) == 1:
        lobby.game_id = game_state.id
        lobby.started = True
    
    logger.info(f"Player {player_name} joined game {lobby.game_id}, total players: {len(lobby.players) + 1}, pot: {game_state.pot_amount if lobby.game_id else 0}")

    # Now add player to lobby list
    lobby.players.append(player_name)
    if not hasattr(lobby, 'player_uids'):
        lobby.player_uids = [lobby.host_uid]
    lobby.player_uids.append(request.player_uid)
    lobby.last_updated = datetime.now()

    # Notify everyone (host will now see game_id and switch screen)
    await manager.broadcast_lobby_update(lobby_id, lobby)

    # Return updated lobby + full game state
    game = active_games.get(lobby.game_id) if lobby.game_id else None

    return JSONResponse(content={
        "lobby": lobby.dict(),
        "game": game.dict() if game else None
    })

@app.get("/lobby/list")
async def list_lobbies():
    now = datetime.now()
    expired = []
    for lid, lobby in active_lobbies.items():
        if lobby.started:
            if (now - lobby.last_updated) > timedelta(minutes=10):
                expired.append(lid)
        elif (now - lobby.last_updated) > timedelta(minutes=30):
            expired.append(lid)
    for lid in expired:
        if lid in active_lobbies:
            del active_lobbies[lid]
    return list(active_lobbies.values())

@app.post("/new_game")
async def create_game(
    mode: str = Query("tutorial", description="Game mode: tutorial only for this endpoint"),
    player_name: str = Query("Player", description="Player name"),
    player_uid: str = Query("", description="Player UID"),
    cpu_count: int = Query(1, description="Number of CPU players (for tutorial)"),
    entry_fee: int = Query(0, description="Entry fee (0 for tutorial)")
):
    if mode != "tutorial":
        raise HTTPException(status_code=400, detail="Invalid mode. This endpoint is for 'tutorial' only. Use lobby for 'multiplayer'.")
    
    game = new_game_state(mode, player_name, player_uid=player_uid, cpu_count=cpu_count)
    active_games[game.id] = game
    logger.info(f"Game created: {game.id} in {mode} mode by {player_name}")
    return game.dict()

@app.get("/game/{game_id}")
async def get_game(game_id: str):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    return active_games[game_id].dict()

@app.post("/game/{game_id}/draw")
async def draw_card(game_id: str):
    game = active_games.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if not game.deck:
        raise HTTPException(status_code=400, detail="Deck empty")
    if game.has_drawn:
        raise HTTPException(status_code=400, detail="Already drawn")

    card = game.deck.pop()
    game.players[game.current_player].hand.append(card)
    game.has_drawn = True

    winner, hand = check_any_player_win(game.players, game.pot)
    if winner:
        game.winner = winner
        game.winner_hand = [c.dict() for c in hand]
        game.game_over = True
        # Distribute winnings
        await distribute_winnings(game)

    await manager.broadcast_game_update(game_id, game)
    return game.dict()

@app.post("/game/{game_id}/discard")
async def discard_card(game_id: str, card_index: int = Query(...)):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = active_games[game_id]
    player = game.players[game.current_player]

    if not game.has_drawn:
        raise HTTPException(status_code=400, detail="Must draw first")
    if not (0 <= card_index < len(player.hand)):
        raise HTTPException(status_code=400, detail="Invalid card")

    card = player.hand.pop(card_index)
    game.pot.append(card)
    game.has_drawn = False

    winner, hand = check_any_player_win(game.players, game.pot)
    if winner:
        game.winner = winner
        game.winner_hand = [c.dict() for c in hand]
        game.game_over = True
        # Distribute winnings
        await distribute_winnings(game)
    else:
        game.current_player = (game.current_player + 1) % len(game.players)

    await manager.broadcast_game_update(game_id, game)
    return game.dict()

@app.get("/")
async def root():
    return {"message": "Njuka King backend is live & fixed! 🔥"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# WebSocket Endpoints
@app.websocket("/ws/game/{game_id}")
async def ws_game(websocket: WebSocket, game_id: str, player_name: str = Query(...)):
    if game_id not in active_games:
        await websocket.close(code=1008)
        return
    await manager.connect_to_game(websocket, game_id, player_name)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect_from_game(game_id, player_name)
    except:
        manager.disconnect_from_game(game_id, player_name)

@app.websocket("/ws/lobby/{lobby_id}")
async def ws_lobby(websocket: WebSocket, lobby_id: str):
    if lobby_id not in active_lobbies:
        await websocket.close(code=1008)
        return
    await manager.connect_to_lobby(websocket, lobby_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect_from_lobby(websocket, lobby_id)
    except:
        manager.disconnect_from_lobby(websocket, lobby_id)

# Win condition logic
def card_value_index(card):
    return values.index(card.value) + 1

def is_winning_combination(cards: List[Card]) -> bool:
    if len(cards) not in (3, 4):
        return False
    vals = [card_value_index(c) for c in cards]
    count = {}
    for v in vals:
        count[v] = count.get(v, 0) + 1
    pairs = sum(1 for c in count.values() if c == 2)
    if pairs != 1:
        return False
    pair_val = [k for k, v in count.items() if v == 2][0]
    others = sorted([v for v in vals if v != pair_val])
    if len(others) != 2:
        return False
    if others == [1, 13]:  # A + K
        return True
    return others[1] - others[0] == 1

def check_any_player_win(players, pot):
    top = pot[-1] if pot else None
    for p in players:
        if len(p.hand) == 4 and is_winning_combination(p.hand):
            return p.name, p.hand
        if top and len(p.hand) == 3:
            test = p.hand + [top]
            if is_winning_combination(test):
                return p.name, test
    return None, None

async def distribute_winnings(game: GameState):
    """Distribute winnings to the winner and house cut"""
    if not game.winner or game.pot_amount <= 0:
        return
    
    try:
        # Calculate winnings: 90% to winner, 10% to house
        house_cut = int(game.pot_amount * 0.1)
        winner_amount = game.pot_amount - house_cut
        
        # Get winner's UID
        winner_player = next((p for p in game.players if p.name == game.winner), None)
        winner_uid = winner_player.uid if winner_player else game.winner # Fallback to name if UID not set (old games)
        
        # Update winner's wallet using winner_uid
        winner_ref = db.collection('users').document(winner_uid)
        
        @firestore.transactional
        def update_winner_wallet(transaction):
            winner_snapshot = winner_ref.get(transaction=transaction)
            if winner_snapshot.exists:
                winner_data = winner_snapshot.to_dict()
                current_balance = winner_data.get('wallet_balance', 0)
                new_balance = current_balance + winner_amount
                transaction.update(winner_ref, {'wallet_balance': new_balance})
                return new_balance
            return None
        
        winner_new_balance = update_winner_wallet(db.transaction())
        if winner_new_balance is not None:
            logger.info(f"Added {winner_amount} to winner {game.winner}, new balance: {winner_new_balance}")
        
        # Update house wallet
        house_ref = db.collection('house').document('admin')
        
        @firestore.transactional
        def update_house_wallet(transaction):
            house_snapshot = house_ref.get(transaction=transaction)
            if house_snapshot.exists:
                house_data = house_snapshot.to_dict()
                current_balance = house_data.get('wallet_balance', 0)
                new_balance = current_balance + house_cut
                transaction.update(house_ref, {'wallet_balance': new_balance})
                return new_balance
            else:
                # Create house document if it doesn't exist
                transaction.set(house_ref, {'wallet_balance': house_cut})
                return house_cut
        
        house_new_balance = update_house_wallet(db.transaction())
        logger.info(f"Added {house_cut} to house, new balance: {house_new_balance}")
        
        # Log transactions
        transactions_ref = db.collection('transactions')
        transactions_ref.add({
            'type': 'game_winnings',
            'game_id': game.id,
            'winner': game.winner,
            'pot_amount': game.pot_amount,
            'winner_amount': winner_amount,
            'house_cut': house_cut,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
    except Exception as e:
        logger.error(f"Failed to distribute winnings for game {game.id}: {e}")
        # Don't raise exception to avoid breaking game flow

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)