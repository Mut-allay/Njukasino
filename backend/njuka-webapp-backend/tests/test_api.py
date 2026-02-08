import pytest
from unittest.mock import MagicMock

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_lobby_success(client, mock_firebase):
    # Mock user balance
    mock_user_doc = MagicMock()
    mock_user_doc.exists = True
    mock_user_doc.to_dict.return_value = {"wallet_balance": 500}
    mock_firebase.collection('users').document('host_uid').get.return_value = mock_user_doc

    request_data = {
        "host": "Test Host",
        "host_uid": "host_uid",
        "max_players": 4,
        "entry_fee": 100
    }
    
    response = client.post("/lobby/create", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert data["host"] == "Test Host"
    assert data["entry_fee"] == 100
    assert "id" in data

def test_create_lobby_insufficient_balance(client, mock_firebase):
    # Mock user balance
    mock_user_doc = MagicMock()
    mock_user_doc.exists = True
    mock_user_doc.to_dict.return_value = {"wallet_balance": 50}
    mock_firebase.collection('users').document('poor_host').get.return_value = mock_user_doc

    request_data = {
        "host": "Poor Host",
        "host_uid": "poor_host",
        "max_players": 4,
        "entry_fee": 100
    }
    
    response = client.post("/lobby/create", json=request_data)
    assert response.status_code == 400
    assert "Insufficient balance" in response.json()["detail"]

def test_join_lobby_success(client, mock_firebase):
    # 1. Create a lobby first (directly in active_lobbies for simplicity if needed, 
    # but let's try via API if we can persist state between calls)
    
    # Mock host balance
    mock_host_doc = MagicMock()
    mock_host_doc.exists = True
    mock_host_doc.to_dict.return_value = {"wallet_balance": 500}
    
    # Mock joining player balance
    mock_player_doc = MagicMock()
    mock_player_doc.exists = True
    mock_player_doc.to_dict.return_value = {"wallet_balance": 300}
    
    # Setup the sequence of returns for .get()
    mock_firebase.collection('users').document('host_uid').get.return_value = mock_host_doc
    mock_firebase.collection('users').document('player_uid').get.return_value = mock_player_doc

    # Create
    create_res = client.post("/lobby/create", json={
        "host": "Host", "host_uid": "host_uid", "entry_fee": 100
    })
    lobby_id = create_res.json()["id"]

    # Join
    join_res = client.post(f"/lobby/{lobby_id}/join", json={
        "player": "Player 2", "player_uid": "player_uid"
    })
    
    assert join_res.status_code == 200
    data = join_res.json()
    assert "Player 2" in data["lobby"]["players"]
