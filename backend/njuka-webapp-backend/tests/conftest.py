import pytest
from unittest.mock import MagicMock, patch
import json
import os

# Mock Firebase before anything else
mock_db = MagicMock()

@pytest.fixture(autouse=True)
def mock_firebase():
    with patch('firebase_admin.credentials.Certificate'), \
         patch('firebase_admin.initialize_app'), \
         patch('firebase_admin.firestore.client', return_value=mock_db):
        
        # Mock env var
        os.environ["FIREBASE_SERVICE_ACCOUNT"] = json.dumps({"project_id": "test-project"})
        
        import main
        main.db = mock_db # Force inject the mock
        
        yield mock_db

@pytest.fixture
def client():
    # Ensure main is imported after mocks are set up
    from main import app
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
