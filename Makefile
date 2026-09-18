.PHONY: up down dev install

install:
	cd backend && pip install -r requirements.txt

dev:
	cd backend && python -m app.main

up:
	cd frontend && npm install && npm run build && cd .. && cd infra && docker compose --env-file ../.env up --build

down:
	cd infra && docker compose down
#