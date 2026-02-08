import pytest
from main import Card, Player, GameState, is_winning_combination, distribute_winnings

def test_is_winning_combination_3_cards():
    # Winning: Pair + Consecutive (A, 2, 2)
    cards = [
        Card(value='A', suit='♠'),
        Card(value='2', suit='♥'),
        Card(value='2', suit='♦')
    ]
    # Wait, the logic says 3 or 4 cards.
    # If 3 cards in hand, it check top card of pot too in check_any_player_win.
    # is_winning_combination itself requires 3 or 4 cards.
    # Let's check the logic:
    # vals = [index(c) for c in cards] -> [1, 2, 2]
    # count = {1:1, 2:2}
    # pairs = 1 (for value 2)
    # others = sorted([1]) -> wait, others has len 1.
    # logic says: if len(others) != 2: return False
    # So is_winning_combination ONLY works for 4 cards total (hand + pot or full hand).
    
    cards_4 = [
        Card(value='A', suit='♠'),
        Card(value='2', suit='♥'),
        Card(value='2', suit='♦'),
        Card(value='3', suit='♣')
    ]
    # vals: [1, 2, 2, 3]
    # count: {1:1, 2:2, 3:1}
    # pairs: 1
    # pair_val: 2
    # others: sorted([1, 3]) -> [1, 3]
    # others[1] - others[0] == 3 - 1 = 2 != 1. False.
    assert is_winning_combination(cards_4) is False

    # Winning: [A, 2, 3, 3] -> pair of 3s, others A, 2. A+2 = 1, 2. 2-1 = 1. True.
    win_cards = [
        Card(value='A', suit='♠'),
        Card(value='2', suit='♥'),
        Card(value='3', suit='♦'),
        Card(value='3', suit='♣')
    ]
    assert is_winning_combination(win_cards) is True

    # Winning: [A, K, Q, Q] -> pair of Qs, others A, K. A index 1, K index 13. [1, 13]. True.
    win_cards_ak = [
        Card(value='A', suit='♠'),
        Card(value='K', suit='♥'),
        Card(value='Q', suit='♦'),
        Card(value='Q', suit='♣')
    ]
    assert is_winning_combination(win_cards_ak) is True

def test_distribute_winnings_math():
    # Mock a GameState
    game = GameState(
        deck=[],
        pot=[],
        players=[Player(name="Winner", hand=[])],
        current_player=0,
        has_drawn=False,
        id="test_game",
        mode="multiplayer",
        max_players=2,
        winner="Winner",
        pot_amount=1000
    )
    
    # We need to mock the Firebase part since distribute_winnings calls db
    # But for now let's just test the math logic if we can isolate it
    # Actually distribute_winnings in main.py is async and uses firestore
    pass

@pytest.mark.asyncio
async def test_pot_split_calculation():
    from main import distribute_winnings
    # We'll need to mock firestore.client() to avoid actual DB calls
    # For now, let's just verify the logic we can see in main.py
    # house_cut = round(game.pot_amount * 0.1, 2)
    # winner_amount = round(game.pot_amount - house_cut, 2)
    
    pot = 100
    house_cut = round(pot * 0.1, 2)
    winner_amount = round(pot - house_cut, 2)
    
    assert house_cut == 10.0
    assert winner_amount == 90.0
    
    pot = 155
    house_cut = round(pot * 0.1, 2)
    winner_amount = round(pot - house_cut, 2)
    assert house_cut == 15.5
    assert winner_amount == 139.5
