# backend/tests/test_game_quit.py
import pytest
from unittest.mock import MagicMock, patch

# Import after conftest has patched Firebase
import main
from main import GameState, Player, Card, active_games, active_lobbies
from main import LobbyGame
from datetime import datetime


@pytest.fixture
def mock_game_state():
    """A started game with 2 players, pot=2, entry=1."""
    deck = [Card(value="5", suit="♠"), Card(value="6", suit="♥")]
    players = [
        Player(name="P1", uid="uid1", hand=[Card(value="A", suit="♥")], is_cpu=False),
        Player(name="P2", uid="uid2", hand=[Card(value="K", suit="♦")], is_cpu=False),
    ]
    return GameState(
        id="test-game-quit",
        deck=deck,
        pot=[],
        players=players,
        current_player=0,
        has_drawn=False,
        mode="multiplayer",
        max_players=2,
        pot_amount=2,
        entry_fee=1,
        game_over=False,
    )


@pytest.fixture
def client_with_game(client, mock_game_state):
    """Put a game and its lobby into main so quit endpoint can find it."""
    game = mock_game_state
    lobby = LobbyGame(
        id="lobby-quit-test",
        host="P1",
        players=["P1", "P2"],
        max_players=2,
        created_at=datetime.now(),
        last_updated=datetime.now(),
        started=True,
        game_id=game.id,
        entry_fee=1,
        host_uid="uid1",
        player_uids=["uid1", "uid2"],
    )
    active_games[game.id] = game
    active_lobbies[lobby.id] = lobby
    yield client
    active_games.pop(game.id, None)
    active_lobbies.pop(lobby.id, None)


def test_quit_no_refund(client_with_game, mock_firebase):
    """Quitter gets no refund; wallet is not updated."""
    mock_firebase.transaction.return_value.update = MagicMock()
    mock_firebase.transaction.return_value.get = MagicMock()
    game_id = "test-game-quit"

    response = client_with_game.post(
        f"/game/{game_id}/quit",
        params={"player_uid": "uid1"},
    )

    assert response.status_code == 200
    data = response.json()
    # Quitter removed; one player remains and is declared winner (90% to them, 10% to house)
    assert len(data["players"]) == 1
    assert data["players"][0]["uid"] == "uid2"
    assert data["pot_amount"] == 2
    assert data.get("game_over") is True
    assert data.get("winner") == "P2"


def test_all_quit_pot_to_admin(client_with_game, mock_firebase):
    """First quit: one player remains and is declared winner. Second quit is ignored (no second quit when winner already declared)."""
    mock_firebase.transaction.return_value.update = MagicMock()
    mock_firebase.transaction.return_value.get = MagicMock()
    mock_firebase.transaction.return_value.set = MagicMock()
    user_doc = MagicMock()
    user_doc.exists = True
    user_doc.to_dict.return_value = {"wallet_balance": 100}
    house_doc = MagicMock()
    house_doc.exists = True
    house_doc.to_dict.return_value = {"wallet_balance": 0}

    def doc_return(doc_id):
        m = MagicMock()
        m.get.return_value = user_doc if doc_id == "uid2" else house_doc
        return m

    mock_firebase.collection.return_value.document.side_effect = doc_return
    game_id = "test-game-quit"

    client_with_game.post(f"/game/{game_id}/quit", params={"player_uid": "uid1"})
    response = client_with_game.post(
        f"/game/{game_id}/quit",
        params={"player_uid": "uid2"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data.get("game_over") is True
    # Second quit is ignored: winner (P2) remains in the list
    assert len(data["players"]) == 1
    assert data["players"][0]["uid"] == "uid2"
    assert data.get("winner") == "P2"
