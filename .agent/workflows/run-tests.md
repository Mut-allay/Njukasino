---
description: Run all tests (Backend, Frontend, and E2E)
---

# Test Runner Workflow

This workflow executes the complete test suite across all layers of the application.

### 1. Backend Tests (Python/Pytest)

```powershell
// turbo
cd backend/njuka-webapp-backend
python -m pytest --cov=. tests/
```

### 2. Frontend Tests (Vitest)

```powershell
// turbo
npm test
```

### 3. E2E Tests (Cypress)

> [!NOTE]
> Requires both frontend and backend to be running locally.

```powershell
npx cypress run
```
