import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_multiplayer_flow():
    print("🚀 Starting Multiplayer Flow Test...")
    
    # 1. Create a 4-player lobby
    host_uid = "test_host_123"
    create_req = {
        "host": "Big Boss",
        "host_uid": host_uid,
        "max_players": 4,
        "entry_fee": 100
    }
    
    res = requests.post(f"{BASE_URL}/lobby/create", json=create_req)
    lobby = res.json()
    lobby_id = lobby['id']
    game_id = lobby['game_id']
    print(f"✅ Lobby created: {lobby_id}, Game ID: {game_id}")
    
    # Verify lobby isn't started yet
    assert lobby['started'] is False
    
    # 2. Join 3 more players
    players = [
        ("Player 2", "p2_uid"),
        ("Player 3", "p3_uid"),
        ("Player 4", "p4_uid")
    ]
    
    for i, (name, uid) in enumerate(players):
        join_req = {"player": name, "player_uid": uid}
        res = requests.post(f"{BASE_URL}/lobby/{lobby_id}/join", json=join_req)
        data = res.json()
        lobby = data['lobby']
        print(f"👤 {name} joined. Players: {len(lobby['players'])}/4")
        
        # Lobby should only be 'started' when the 4th player joins
        if i < 2:
            assert lobby['started'] is False
        else:
            assert lobby['started'] is True
            print("🔥 Game has started!")

    # 3. Verify Game State
    res = requests.get(f"{BASE_URL}/game/{game_id}")
    game = res.json()
    print(f"🎮 Game players: {len(game['players'])}")
    print(f"💰 Pot Amount (should be 400): {game['pot_amount']}")
    
    # 4. Test Cancellation Prevention
    # First player draws
    requests.post(f"{BASE_URL}/game/{game_id}/draw")
    print("🃏 Player 1 draws a card...")
    
    res = requests.post(f"{BASE_URL}/lobby/{lobby_id}/cancel", params={"host_uid": host_uid})
    if res.status_code == 400:
        print("✅ Cancellation correctly prevented after first draw.")
    else:
         print(f"❌ ERROR: Lobby should not be cancellable after draw. Status: {res.status_code}")

if __name__ == "__main__":
    try:
        test_multiplayer_flow()
    except Exception as e:
        print(f"❌ Test Failed: {e}")
