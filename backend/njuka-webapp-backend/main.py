from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Body
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
import requests
from os import getenv

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
    logger.error(f"❌ Firebase initialization failed: {e}")
    db = None

# ====================== LENCO CONFIGURATION ======================
LENCO_BASE_URL = "https://api.lenco.co/access/v2"
LENCO_API_KEY = getenv("LENCO_API_KEY")
if not LENCO_API_KEY:
    logger.warning("⚠️  LENCO_API_KEY not set in .env - deposit features will not work")
else:
    logger.info(f"✅ LENCO_API_KEY loaded (starts with {LENCO_API_KEY[:10]}...)")

# ====================== REQUEST MODELS ======================
class DepositInitiateRequest(BaseModel):
    amount: float
    phone: str
    operator: str  # "airtel" | "mtn"
    reference: str = None  # Will be auto-generated if not provided
    uid: str = None  # Firebase user ID

class DepositVerifyRequest(BaseModel):
    reference: str
    otp: str
    uid: str = None

# ====================== GAME CONFIGURATION ======================

suits = ['♠', '♥', '♦', '♣']
values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

class Card(BaseModel):
    value: str
    suit: str

class Player(BaseModel):
    name: str
    hand: List[Card]
    is_cpu: bool = False
    wallet: int = 0

class GameState(BaseModel):
    deck: List[Card]
    pot: List[Card]
    players: List[Player]
    current_player: int
    has_drawn: bool
    id: str
    mode: str
    max_players: int
    pot_amount: int = 0
    entry_fee: int = 0
    winner: str = ""
    winner_hand: List[Card] = []
    game_over: bool = False

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

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}

    def dict(self, **kwargs):
        data = super().dict(**kwargs)
        data["created_at"] = self.created_at.isoformat()
        data["last_updated"] = self.last_updated.isoformat()
        return data


app = FastAPI(debug=True)

# CORS - Relaxed for development and cross-device testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

active_games: Dict[str, GameState] = {}
active_lobbies: Dict[str, LobbyGame] = {}

class ConnectionManager:
    def __init__(self):
        self.game_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.lobby_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_to_game(self, ws: WebSocket, game_id: str, player_name: str):
        try:
            await ws.accept()
            if game_id not in self.game_connections:
                self.game_connections[game_id] = {}
            self.game_connections[game_id][player_name] = ws
            logger.info(f"Player {player_name} connected to game {game_id}")
        except Exception as e:
            logger.error(f"Failed to connect player {player_name} to game {game_id}: {e}")

    async def connect_to_lobby(self, ws: WebSocket, lobby_id: str):
        try:
            await ws.accept()
            if lobby_id not in self.lobby_connections:
                self.lobby_connections[lobby_id] = set()
            self.lobby_connections[lobby_id].add(ws)
            logger.info(f"Client connected to lobby {lobby_id}")
        except Exception as e:
            logger.error(f"Failed to connect client to lobby {lobby_id}: {e}")

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

def new_game_state(mode: str, player_names: List[str], max_players: int = 4, entry_fee: int = 0, deduct_fees: bool = True) -> GameState:
    deck = create_deck()
    random.shuffle(deck)
    players = []

    for name in player_names:
        # All players start with wallet 0
        players.append(Player(name=name, hand=[], wallet=0))

    if mode == "cpu":
        cpu_to_add = max_players - len(players)
        for i in range(cpu_to_add):
            players.append(Player(name=f"CPU {i+1}", hand=[], is_cpu=True, wallet=10000))
    
    pot_amount = entry_fee * len(players)

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
        pot_amount=pot_amount,
        entry_fee=entry_fee
    )

# ====================== REQUEST MODELS ======================
class CreateLobbyRequest(BaseModel):
    host: str
    max_players: int = 4
    entry_fee: int = 100

class JoinLobbyRequest(BaseModel):
    player: str

# ====================== ROUTES ======================

@app.post("/lobby/create")
async def create_lobby(request: CreateLobbyRequest):
    if not (2 <= request.max_players <= 4):
        raise HTTPException(status_code=400, detail="Max players must be 2-4")

    # Allow lobby creation regardless of wallet (wallet = 0 for all players)
    lobby_id = str(uuid.uuid4())
    lobby = LobbyGame(
        id=lobby_id,
        host=request.host,
        players=[request.host],
        max_players=request.max_players,
        created_at=datetime.now(),
        last_updated=datetime.now(),
        entry_fee=request.entry_fee
    )
    active_lobbies[lobby_id] = lobby
    logger.info(f"Lobby created: {lobby_id} by {request.host} with fee K{request.entry_fee}")
    return lobby.dict()

# ====================== DEPOSIT ENDPOINTS (LENCO) ======================

@app.post("/deposit/initiate")
async def initiate_deposit(data: DepositInitiateRequest = Body(...)):
    """
    Initiate a mobile money deposit with Lenco.
    Returns {reference, status, message}
    """
    if not LENCO_API_KEY or not db:
        raise HTTPException(status_code=503, detail="Deposit service unavailable. Firebase or Lenco not configured.")
    
    # Generate reference if not provided
    reference = data.reference or str(uuid.uuid4())
    
    try:
        # Call Lenco API to initiate deposit
        headers = {
            "Authorization": f"Bearer {LENCO_API_KEY}",
            "Content-Type": "application/json"
        }
        
        lenco_payload = {
            "reference": reference,
            "amount": int(data.amount),
            "phone": data.phone,
            "operator": data.operator.lower()  # "airtel" or "mtn"
        }
        
        logger.info(f"Initiating Lenco deposit: reference={reference}, amount={data.amount}, phone={data.phone}")
        
        response = requests.post(
            f"{LENCO_BASE_URL}/collections/mobile-money/initiate",
            json=lenco_payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("message", "Unknown error from Lenco")
            logger.error(f"Lenco initiate failed: {response.status_code} - {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Deposit initiation failed: {error_detail}"
            )
        
        result = response.json()
        logger.info(f"Lenco initiate success: {result}")
        
        return {
            "reference": reference,
            "status": result.get("data", {}).get("status", "pending"),
            "message": "OTP sent to your phone",
            "user_id": data.uid or "unknown"
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error during deposit initiation: {e}")
        raise HTTPException(
            status_code=503,
            detail="Failed to reach Lenco service. Please try again later."
        )
    except Exception as e:
        logger.error(f"Unexpected error during deposit initiation: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again."
        )

@app.post("/deposit/verify")
async def verify_deposit(data: DepositVerifyRequest = Body(...)):
    """
    Verify OTP and complete deposit.
    Updates user's wallet in Firestore on success.
    """
    if not LENCO_API_KEY or not db:
        raise HTTPException(status_code=503, detail="Deposit service unavailable. Firebase or Lenco not configured.")
    
    try:
        # Call Lenco API to verify OTP
        headers = {
            "Authorization": f"Bearer {LENCO_API_KEY}",
            "Content-Type": "application/json"
        }
        
        lenco_payload = {
            "reference": data.reference,
            "otp": data.otp
        }
        
        logger.info(f"Verifying Lenco deposit: reference={data.reference}")
        
        response = requests.post(
            f"{LENCO_BASE_URL}/collections/mobile-money/submit-otp",
            json=lenco_payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("message", "Verification failed")
            logger.error(f"Lenco verify failed: {response.status_code} - {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Invalid OTP or reference: {error_detail}"
            )
        
        result = response.json()
        deposit_data = result.get("data", {})
        
        # Check if deposit was successful
        if deposit_data.get("status") != "successful":
            logger.warning(f"Deposit not successful: status={deposit_data.get('status')}")
            raise HTTPException(
                status_code=400,
                detail="Deposit verification failed. Please try again."
            )
        
        amount = float(deposit_data.get("amount", 0))
        phone = deposit_data.get("phone", "")
        
        logger.info(f"Lenco verify success: amount={amount}, phone={phone}")
        
        # Update user's wallet in Firestore
        uid = data.uid
        if uid:
            try:
                user_ref = db.collection("users").document(uid)
                user_ref.update({
                    "wallet": firestore.Increment(amount),
                    "last_deposit": datetime.now(),
                    "last_deposit_reference": data.reference
                })
                logger.info(f"User {uid} wallet updated: +K{amount}")
            except Exception as e:
                logger.error(f"Failed to update wallet in Firestore for {uid}: {e}")
                # Don't fail the entire operation, deposit was successful
        else:
            logger.warning(f"No uid provided for deposit {data.reference}. Wallet not updated in Firestore.")
        
        return {
            "reference": data.reference,
            "status": "successful",
            "amount": amount,
            "message": f"Deposit of K{amount} completed successfully",
            "user_id": uid or "unknown"
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error during deposit verification: {e}")
        raise HTTPException(
            status_code=503,
            detail="Failed to reach Lenco service. Please try again later."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during deposit verification: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again."
        )

@app.post("/webhook/lenco")
async def lenco_webhook(payload: dict = Body(...)):
    """
    Webhook endpoint for async Lenco callbacks.
    Lenco will POST to this endpoint when a transaction completes.
    """
    try:
        logger.info(f"Lenco webhook received: {payload}")
        
        reference = payload.get("reference")
        status = payload.get("status")
        amount = payload.get("amount")
        
        if status == "successful" and reference and amount:
            # You could store this in a database or trigger additional logic
            logger.info(f"Webhook: Deposit {reference} successful for K{amount}")
        
        # Always return 200 OK to acknowledge webhook
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"Error processing Lenco webhook: {e}")
        # Still return 200 OK - webhook should not retry on error
        return {"status": "received", "error": str(e)}

@app.get("/wallet/{player_name}")
async def get_wallet(player_name: str, uid: str = None):
    """
    Fetch player's wallet balance from Firestore.
    If uid is provided, use it directly. Otherwise, search by player_name.
    Falls back to 0 if user not found or Firestore unavailable.
    """
    if not db:
        logger.warning("Firestore not available, returning wallet=0")
        return {"wallet": 0}
    
    try:
        if uid:
            # Direct lookup by uid (more efficient)
            user_doc = db.collection("users").document(uid).get()
            if user_doc.exists:
                wallet = user_doc.get("wallet", 0)
                logger.info(f"Wallet for uid {uid}: K{wallet}")
                return {"wallet": wallet}
        else:
            # Search by player name
            users = db.collection("users").where("name", "==", player_name).limit(1).stream()
            for user_doc in users:
                wallet = user_doc.get("wallet", 0)
                logger.info(f"Wallet for player {player_name}: K{wallet}")
                return {"wallet": wallet}
        
        # User not found, return default 0
        logger.info(f"Player {player_name} not found in Firestore, returning wallet=0")
        return {"wallet": 0}
        
    except Exception as e:
        logger.error(f"Error fetching wallet for {player_name or uid}: {e}")
        # Fail gracefully - return 0 instead of error
        return {"wallet": 0}

@app.post("/lobby/{lobby_id}/join")
async def join_lobby(lobby_id: str, request: JoinLobbyRequest):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")

    lobby = active_lobbies[lobby_id]
    player_name = request.player

    # CRITICAL: Check idempotency BEFORE "Lobby is full" to handle retries on the last slot
    if player_name in lobby.players:
        logger.info(f"Player {player_name} already in lobby {lobby_id}. Returning current state (idempotent).")
        game = active_games.get(lobby.game_id) if lobby.game_id else None
        return JSONResponse(content={
            "lobby": lobby.dict(),
            "game": game.dict() if game else None
        })

    if len(lobby.players) >= lobby.max_players:
        raise HTTPException(status_code=400, detail="Lobby is full")

    # Add player to lobby
    lobby.players.append(player_name)
    lobby.last_updated = datetime.now()

    # START GAME ONLY WHEN FULL
    if len(lobby.players) == lobby.max_players:
        logger.info(f"Lobby {lobby_id} full ({len(lobby.players)}/{lobby.max_players}). Starting game.")
        # No fee deductions - all players have wallet = 0
        game_state = new_game_state("multiplayer", lobby.players, max_players=lobby.max_players, entry_fee=lobby.entry_fee, deduct_fees=False)
        active_games[game_state.id] = game_state
        lobby.game_id = game_state.id
        lobby.started = True
        logger.info(f"Game {game_state.id} created for lobby {lobby_id}")
    else:
        logger.info(f"Player {player_name} joined lobby {lobby_id}. Waiting for more players ({len(lobby.players)}/{lobby.max_players})")

    # Notify everyone
    await manager.broadcast_lobby_update(lobby_id, lobby)

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
async def create_cpu_game(player_name: str = "Player", cpu_count: int = 1, entry_fee: int = 0):
    if not (1 <= cpu_count <= 3):
        raise HTTPException(status_code=400, detail="CPU count must be between 1 and 3")
    
    # No wallet checks - all players have wallet = 0
    # In CPU mode, max_players should be human(1) + cpu_count
    actual_max_players = cpu_count + 1
    game = new_game_state("cpu", [player_name], max_players=actual_max_players, entry_fee=entry_fee, deduct_fees=False)
    active_games[game.id] = game
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
        game.winner_hand = hand
        game.game_over = True
        # No wallet earnings - all players have wallet = 0
        logger.info(f"Winner: {winner}. Game over.")

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
        game.winner_hand = hand
        game.game_over = True
        # No wallet earnings - all players have wallet = 0
        logger.info(f"Winner: {winner}. Game over.")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
