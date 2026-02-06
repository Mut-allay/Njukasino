from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import Annotated, List, Dict, Optional, Set
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

DEBUG_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".cursor", "debug.log")

def _debug_log(location: str, message: str, data: dict):
    try:
        import time
        line = json.dumps({
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(time.time() * 1000),
            "sessionId": "debug-session",
            "hypothesisId": data.get("hypothesisId", ""),
        }) + "\n"
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass

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
    winner_amount: float = 0
    house_cut: float = 0
    any_player_has_drawn: bool = False

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
        payload = lobby.dict()
        payload["started"] = getattr(lobby, "started", False)
        payload["game_id"] = getattr(lobby, "game_id", None)
        message = json.dumps({"type": "lobby_update", "data": payload})
        num_connections = len(self.lobby_connections[lobby_id])
        _debug_log("main.py:broadcast_lobby_update", "broadcast", {"lobby_id": lobby_id, "started": payload["started"], "game_id": payload.get("game_id"), "num_connections": num_connections, "hypothesisId": "A"})
        disconnected = []
        for ws in self.lobby_connections[lobby_id]:
            try:
                await ws.send_text(message)
            except Exception:
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

def _normalize_balance(raw):
    """Ensure balance is numeric for comparison. Firestore may return int, float, or str."""
    if raw is None:
        return 0
    if isinstance(raw, (int, float)):
        return int(raw) if isinstance(raw, float) and raw == int(raw) else float(raw)
    try:
        return int(float(str(raw).strip()))
    except (ValueError, TypeError):
        return 0


@app.post("/lobby/create")
async def create_lobby(request: CreateLobbyRequest):
    if not (2 <= request.max_players <= 8):
        raise HTTPException(status_code=400, detail="Max players must be 2-8")
    if request.entry_fee < 1:
        raise HTTPException(status_code=400, detail="minimum fee is K1")

    # Check host balance before creation
    user_ref = db.collection('users').document(request.host_uid)
    user_snap = user_ref.get()
    if not user_snap.exists:
        raise HTTPException(status_code=404, detail="User not found")

    balance = _normalize_balance(user_snap.to_dict().get('wallet_balance'))
    _debug_log("main.py:create_lobby", "wallet_check", {"host_uid": request.host_uid, "balance": balance, "entry_fee": request.entry_fee, "hypothesisId": "H6"})
    # Strict: K0 cannot create any game; balance must be >= entry_fee
    if balance <= 0:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance. You have K0. Please top up your wallet to create or join a game."
        )
    if balance < request.entry_fee:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. You have K{balance}, but the entry fee is K{request.entry_fee}. Please top up your wallet to play."
        )

    # WE NO LONGER DEDUCT FEE HERE. Deduction happens when the game starts (last player joins).
    
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
    
    # NEW: Create a GameState immediately so the host can see the board (blurred)
    game_state = new_game_state("multiplayer", lobby.host, player_uid=lobby.host_uid, max_players=lobby.max_players, entry_fee=lobby.entry_fee)
    active_games[game_state.id] = game_state
    lobby.game_id = game_state.id
    
    logger.info(f"Lobby created: {lobby_id} by {request.host}. Game {game_state.id} initialized (Waiting).")
    return lobby.dict()

@app.post("/lobby/{lobby_id}/start")
async def start_lobby(lobby_id: str, host_uid: str = Query(...)):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")
    
    lobby = active_lobbies[lobby_id]
    if lobby.host_uid != host_uid:
        raise HTTPException(status_code=403, detail="Only the host can start the game")
    
    if len(lobby.players) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players to start")
    
    if lobby.started:
        raise HTTPException(status_code=400, detail="Game already started")

    game_state = active_games.get(lobby.game_id)
    if not game_state:
        raise HTTPException(status_code=500, detail="Game state missing from lobby")

    # Deduct fees and start game
    await start_game_process(lobby, game_state)
    lobby.started = True
    lobby.last_updated = datetime.now()

    # Notify everyone
    await manager.broadcast_lobby_update(lobby_id, lobby)
    await manager.broadcast_game_update(game_state.id, game_state)

    return {"status": "success", "lobby": lobby.dict(), "game": game_state.dict()}

@app.post("/lobby/{lobby_id}/quit")
async def quit_lobby(lobby_id: str, player_uid: str = Query(...)):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")
    
    lobby = active_lobbies[lobby_id]
    
    if player_uid not in lobby.player_uids:
        raise HTTPException(status_code=404, detail="Player not in lobby")
    
    if lobby.started:
        raise HTTPException(status_code=400, detail="Cannot quit once game has started. Use in-game quit if available.")

    # Remove player from lobby
    index = lobby.player_uids.index(player_uid)
    player_name = lobby.players[index]
    
    lobby.players.pop(index)
    lobby.player_uids.pop(index)
    lobby.last_updated = datetime.now()

    # Remove player from game state
    game_state = active_games.get(lobby.game_id)
    if game_state:
        game_state.players = [p for p in game_state.players if p.uid != player_uid]
        # Return cards to deck if player had cards (though game hasn't started, they were dealt 3)
        # For simplicity, we can just leave them if game hasn't started.

    # If host leaves, cancel lobby
    if player_uid == lobby.host_uid:
        await cancel_lobby(lobby_id, player_uid)
        return {"status": "success", "message": "Host left, lobby cancelled"}

    # Notify remaining participants
    await manager.broadcast_lobby_update(lobby_id, lobby)
    if game_state:
        await manager.broadcast_game_update(game_state.id, game_state)

    return {"status": "success", "message": "Player left lobby"}

@app.post("/lobby/{lobby_id}/join")
async def join_lobby(lobby_id: str, request: JoinLobbyRequest):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")

    lobby = active_lobbies[lobby_id]
    player_name = request.player

    if len(lobby.players) >= lobby.max_players:
        raise HTTPException(status_code=400, detail="Lobby is full")

    if player_name in lobby.players or request.player_uid in lobby.player_uids:
        raise HTTPException(status_code=400, detail="Player already in lobby")

    # Check joining player balance before joining
    user_ref = db.collection('users').document(request.player_uid)
    user_snap = user_ref.get()
    if not user_snap.exists:
        raise HTTPException(status_code=404, detail="User not found")

    balance = _normalize_balance(user_snap.to_dict().get('wallet_balance'))
    _debug_log("main.py:join_lobby", "wallet_check", {"player_uid": request.player_uid, "balance": balance, "entry_fee": lobby.entry_fee, "hypothesisId": "H6"})
    if balance <= 0:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance. You have K0. Please top up your wallet to create or join a game."
        )
    if balance < lobby.entry_fee:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. This room requires K{lobby.entry_fee}, but you only have K{balance}. Please top up to join."
        )

    # Get the existing game state
    game_state = active_games.get(lobby.game_id)
    if not game_state:
         raise HTTPException(status_code=500, detail="Game state missing from lobby")

    # Add joining player to the game with 3 cards
    new_player = Player(name=player_name, uid=request.player_uid, hand=[])
    for _ in range(3):
        if game_state.deck:
            new_player.hand.append(game_state.deck.pop())
    game_state.players.append(new_player)

    # Add player to lobby list
    lobby.players.append(player_name)
    lobby.player_uids.append(request.player_uid)
    lobby.last_updated = datetime.now()

    # AUTO-START IF ROOM IS FULL: complete start_game_process before setting started or broadcasting
    if len(lobby.players) == lobby.max_players:
        _debug_log("main.py:join_lobby", "quorum_reached", {"lobby_id": lobby_id, "game_id": game_state.id, "players": len(lobby.players), "hypothesisId": "H1"})
        logger.info(f"Last player {player_name} joined. Auto-starting game {game_state.id}...")
        await start_game_process(lobby, game_state)
        lobby.started = True
        lobby.last_updated = datetime.now()
        _debug_log("main.py:join_lobby", "after_start_process", {"lobby_id": lobby_id, "started": lobby.started, "game_id": lobby.game_id, "hypothesisId": "H1"})

    # Broadcast lobby update so ALL clients (including existing players) see started=True and game_id
    await manager.broadcast_lobby_update(lobby_id, lobby)
    await manager.broadcast_game_update(game_state.id, game_state)

    return JSONResponse(content={
        "lobby": lobby.dict(),
        "game": game_state.dict()
    })

async def start_game_process(lobby: LobbyGame, game: GameState):
    """Handles wallet deductions and game state activation when lobby is full."""
    if lobby.entry_fee <= 0:
        game.pot_amount = 0
        return

    total_pool = 0
    success_count = 0
    
    for uid in lobby.player_uids:
        try:
            user_ref = db.collection('users').document(uid)
            
            @firestore.transactional
            def deduct_transaction(transaction):
                snapshot = user_ref.get(transaction=transaction)
                if snapshot.exists:
                    data = snapshot.to_dict()
                    balance = data.get('wallet_balance', 0)
                    if balance < lobby.entry_fee:
                        raise HTTPException(status_code=400, detail=f"Insufficient balance for player {uid}")
                    transaction.update(user_ref, {'wallet_balance': balance - lobby.entry_fee})
                    return True
                return False

            if deduct_transaction(db.transaction()):
                total_pool += lobby.entry_fee
                success_count += 1
                logger.info(f"Deducted {lobby.entry_fee} from {uid}")
        except Exception as e:
            logger.error(f"Failed to deduct fee from {uid}: {e}")
            # In a real casino, you might eject the player here, but for now we log and move on
            # to avoid blocking the whole game if one player's Firebase connection flickers.

    game.pot_amount = total_pool
    logger.info(f"Game process complete. Pot: {game.pot_amount}, Success: {success_count}/{len(lobby.player_uids)}")

@app.get("/lobby/list")
async def list_lobbies():
    now = datetime.now()
    expired = []
    visible_lobbies = []
    for lid, lobby in active_lobbies.items():
        # Cleanup expired
        if lobby.started:
            if (now - lobby.last_updated) > timedelta(minutes=10):
                expired.append(lid)
                continue
        elif (now - lobby.last_updated) > timedelta(minutes=30):
            expired.append(lid)
            continue
        
        # Filter: Hide full or started games
        if not lobby.started and len(lobby.players) < lobby.max_players:
            visible_lobbies.append(lobby)

    for lid in expired:
        if lid in active_lobbies:
            del active_lobbies[lid]
            
    return visible_lobbies

@app.post("/lobby/{lobby_id}/cancel")
async def cancel_lobby(lobby_id: str, host_uid: str = Query(...)):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")

    lobby = active_lobbies[lobby_id]
    
    # Verify host
    if lobby.host_uid != host_uid:
        raise HTTPException(status_code=403, detail="Only the host can cancel the lobby")

    # Check if the game has actually had any cards drawn
    game = active_games.get(lobby.game_id)
    if game:
        if game.any_player_has_drawn:
            # If the first player (or anyone) has drawn, someone exited or host is trying to bail. 
            # Per rules: no refund if first person draws. 
            raise HTTPException(status_code=400, detail="Cannot cancel a game once a move has been made.")
        
        # If no cards drawn, we can still cancel. Delete the game state.
        del active_games[lobby.game_id]
        logger.info(f"Deleted game state {lobby.game_id} during cancel")

    # Refund all participants IF the lobby had started (meaning wallets were deducted)
    # If lobby.started is False, it means wallets haven't been deducted yet (new logic).
    if lobby.started and lobby.entry_fee > 0:
        participants = set(lobby.player_uids)
        for p_uid in participants:
            try:
                user_ref = db.collection('users').document(p_uid)
                @firestore.transactional
                def refund_transaction(transaction):
                    snapshot = user_ref.get(transaction=transaction)
                    if snapshot.exists:
                        data = snapshot.to_dict()
                        balance = data.get('wallet_balance', 0)
                        transaction.update(user_ref, {'wallet_balance': balance + lobby.entry_fee})
                        return balance + lobby.entry_fee
                    return None
                
                new_balance = refund_transaction(db.transaction())
                if new_balance is not None:
                    logger.info(f"Refunded {lobby.entry_fee} to {p_uid}, new balance: {new_balance}")
                    db.collection('transactions').add({
                        'type': 'lobby_refund',
                        'lobby_id': lobby_id,
                        'user_uid': p_uid,
                        'amount': lobby.entry_fee,
                        'timestamp': firestore.SERVER_TIMESTAMP
                    })
            except Exception as e:
                logger.error(f"Failed to refund {p_uid} for lobby {lobby_id}: {e}")

    # Notify participants via WebSocket
    message = json.dumps({"type": "lobby_cancelled", "data": {"lobby_id": lobby_id}})
    if lobby_id in manager.lobby_connections:
        disconnected = []
        for ws in manager.lobby_connections[lobby_id]:
            try:
                await ws.send_text(message)
            except:
                disconnected.append(ws)
        for ws in disconnected:
            manager.disconnect_from_lobby(ws, lobby_id)

    # Delete lobby
    del active_lobbies[lobby_id]
    logger.info(f"Lobby cancelled: {lobby_id}")
    return {"status": "success", "message": "Lobby cancelled and participants refunded (if applicable)"}

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
    if game.game_over:
        return game.dict()
    if not game.deck:
        raise HTTPException(status_code=400, detail="Deck empty")
    if game.has_drawn:
        raise HTTPException(status_code=400, detail="Already drawn")

    card = game.deck.pop()
    game.players[game.current_player].hand.append(card)
    game.has_drawn = True
    game.any_player_has_drawn = True

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
    if game.game_over:
        return game.dict()
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


# Admin endpoints
from auth import get_current_admin

@app.get("/api/admin/house-balance")
async def get_house_balance(
    uid: Annotated[str, Depends(get_current_admin)],
):
    """Return total house earnings from Firestore house/admin document."""
    try:
        house_ref = db.collection('house').document('admin')
        doc = house_ref.get()
        if doc.exists:
            balance = doc.to_dict().get('wallet_balance', 0)
        else:
            balance = 0
        return {"house_balance": balance}
    except Exception as e:
        logger.error(f"Error fetching house balance: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch house balance")

# WebSocket Endpoints
@app.websocket("/ws/game/{game_id}")
async def ws_game(websocket: WebSocket, game_id: str, player_name: str = Query(...)):
    await websocket.accept()
    if game_id not in active_games:
        logger.warning(f"WebSocket connection attempt for non-existent game: {game_id}")
        await websocket.close(code=1008)
        return
    
    if game_id not in manager.game_connections:
        manager.game_connections[game_id] = {}
    manager.game_connections[game_id][player_name] = websocket
    
    logger.info(f"Connected to game WebSocket: {game_id} for player {player_name}")
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
    await websocket.accept()
    if lobby_id not in active_lobbies:
        logger.warning(f"WebSocket connection attempt for non-existent lobby: {lobby_id}")
        await websocket.close(code=1008)
        return
    
    if lobby_id not in manager.lobby_connections:
        manager.lobby_connections[lobby_id] = set()
    manager.lobby_connections[lobby_id].add(websocket)
    
    logger.info(f"Connected to lobby WebSocket: {lobby_id}")
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
        # Use round to handle floats and convert to float for transparency
        house_cut = round(game.pot_amount * 0.1, 2)
        winner_amount = round(game.pot_amount - house_cut, 2)
        
        # Store in game state for frontend
        game.house_cut = house_cut
        game.winner_amount = winner_amount
        
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