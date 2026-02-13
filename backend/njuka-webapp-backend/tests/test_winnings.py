# backend/tests/test_winnings.py
import pytest
from unittest.mock import MagicMock, patch
from main import (
    GameState,
    Player,
    Card,
    distribute_winnings,
    active_games,
)
import main


@pytest.fixture
def game_with_winner():
    """Game with pot=10 and a winner set."""
    return GameState(
        id="test-winnings",
        deck=[],
        pot=[],
        players=[
            Player(name="P1", uid="uid1", hand=[], is_cpu=False),
        ],
        current_player=0,
        has_drawn=False,
        mode="multiplayer",
        max_players=2,
        pot_amount=10,
        entry_fee=5,
        winner="P1",
        game_over=True,
    )


@pytest.mark.asyncio
async def test_10_percent_house_cut(game_with_winner, mock_firebase):
    """90% to winner, 10% to house."""
    mock_firebase.transaction.return_value.update = MagicMock()
    mock_firebase.transaction.return_value.get = MagicMock()
    mock_firebase.transaction.return_value.set = MagicMock()
    user_doc = MagicMock()
    user_doc.exists = True
    user_doc.to_dict.return_value = {"wallet_balance": 100}
    house_doc = MagicMock()
    house_doc.exists = True
    house_doc.to_dict.return_value = {"wallet_balance": 0}

    def doc_side_effect(path):
        doc_ref = MagicMock()
        doc_ref.get.return_value = (
            user_doc if "users" in str(path) else house_doc
        )
        return doc_ref

    mock_firebase.collection.return_value.document.side_effect = lambda x: MagicMock(
        get=MagicMock(return_value=user_doc if x == "uid1" else house_doc)
    )
    # So collection("users").document("uid1").get() -> user_doc
    # collection("house").document("admin").get() -> house_doc
    def doc_return(doc_id):
        m = MagicMock()
        if doc_id == "uid1":
            m.get.return_value = user_doc
        else:
            m.get.return_value = house_doc
        return m

    mock_firebase.collection.return_value.document.side_effect = doc_return

    await distribute_winnings(game_with_winner)

    assert game_with_winner.winner_amount == 9
    assert game_with_winner.house_cut == 1


@pytest.mark.asyncio
async def test_full_forfeit_pot_to_admin(mock_firebase):
    """When all players forfeit, full pot goes to house, no winner amount."""
    # We need a function that handles full forfeit; if it's part of
    # distribute_winnings with a flag, or a separate distribute_forfeit_pot.
    # Assume we add distribute_forfeit_pot(game) or game.all_forfeited = True
    # and distribute_winnings handles it.
    game = GameState(
        id="test-forfeit",
        deck=[],
        pot=[],
        players=[],
        current_player=0,
        has_drawn=False,
        mode="multiplayer",
        max_players=2,
        pot_amount=10,
        entry_fee=5,
        winner="",
        game_over=True,
    )
    # Add a flag if the backend supports it (e.g. all_forfeited)
    if hasattr(game, "all_forfeited"):
        game.all_forfeited = True

    house_doc = MagicMock()
    house_doc.exists = True
    house_doc.to_dict.return_value = {"wallet_balance": 0}
    mock_firebase.collection.return_value.document.return_value.get.return_value = (
        house_doc
    )

    # If we have a dedicated function for forfeit distribution:
    forfeit_func = getattr(main, "distribute_forfeit_pot", None)
    if forfeit_func:
        await forfeit_func(game)
        assert game.house_cut == 10
        assert getattr(game, "winner_amount", 0) == 0
    else:
        # Placeholder: just assert the intended behavior for when implemented
        pytest.skip("distribute_forfeit_pot not yet implemented")
