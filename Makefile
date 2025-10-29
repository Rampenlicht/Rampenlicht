# Makefile für Rampenlicht App
# Vereinfacht Docker-Befehle

.PHONY: help dev prod build clean logs restart health

# Default target
.DEFAULT_GOAL := help

# Farben für Output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

## help: Zeigt diese Hilfe an
help:
	@echo "$(GREEN)Rampenlicht App - Docker Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Development:$(NC)"
	@echo "  make dev          - Startet Development Server (Port 5173)"
	@echo "  make dev-build    - Baut und startet Dev Server"
	@echo "  make dev-logs     - Zeigt Dev Server Logs"
	@echo ""
	@echo "$(YELLOW)Production:$(NC)"
	@echo "  make prod         - Startet Production Server (Port 3000)"
	@echo "  make prod-build   - Baut und startet Prod Server"
	@echo "  make prod-logs    - Zeigt Prod Server Logs"
	@echo ""
	@echo "$(YELLOW)Nginx:$(NC)"
	@echo "  make nginx        - Startet mit Nginx Reverse Proxy (Port 80)"
	@echo "  make nginx-logs   - Zeigt Nginx Logs"
	@echo ""
	@echo "$(YELLOW)Allgemein:$(NC)"
	@echo "  make build        - Baut alle Images neu"
	@echo "  make clean        - Stoppt und entfernt alle Container"
	@echo "  make restart      - Startet alle Container neu"
	@echo "  make logs         - Zeigt alle Logs"
	@echo "  make health       - Prüft Container Health Status"
	@echo "  make shell        - Öffnet Shell im Container"
	@echo ""

## dev: Startet Development Server
dev:
	@echo "$(GREEN)Starte Development Server...$(NC)"
	docker-compose --profile dev up

## dev-build: Baut und startet Dev Server
dev-build:
	@echo "$(GREEN)Baue und starte Development Server...$(NC)"
	docker-compose --profile dev up --build

## dev-logs: Zeigt Dev Server Logs
dev-logs:
	docker-compose --profile dev logs -f dev

## dev-stop: Stoppt Dev Server
dev-stop:
	@echo "$(YELLOW)Stoppe Development Server...$(NC)"
	docker-compose --profile dev down

## prod: Startet Production Server
prod:
	@echo "$(GREEN)Starte Production Server...$(NC)"
	docker-compose --profile prod up -d
	@echo "$(GREEN)✅ App läuft auf http://localhost:3000$(NC)"

## prod-build: Baut und startet Prod Server
prod-build:
	@echo "$(GREEN)Baue und starte Production Server...$(NC)"
	docker-compose --profile prod up -d --build
	@echo "$(GREEN)✅ App läuft auf http://localhost:3000$(NC)"

## prod-logs: Zeigt Prod Server Logs
prod-logs:
	docker-compose --profile prod logs -f app

## prod-stop: Stoppt Prod Server
prod-stop:
	@echo "$(YELLOW)Stoppe Production Server...$(NC)"
	docker-compose --profile prod down

## nginx: Startet mit Nginx
nginx:
	@echo "$(GREEN)Starte mit Nginx Reverse Proxy...$(NC)"
	docker-compose --profile nginx --profile prod up -d
	@echo "$(GREEN)✅ App läuft auf http://localhost:80$(NC)"

## nginx-logs: Zeigt Nginx Logs
nginx-logs:
	docker-compose --profile nginx logs -f nginx

## build: Baut alle Images neu
build:
	@echo "$(GREEN)Baue alle Images neu...$(NC)"
	docker-compose build --no-cache

## clean: Stoppt und entfernt alle Container
clean:
	@echo "$(YELLOW)Stoppe und entferne alle Container...$(NC)"
	docker-compose down --remove-orphans
	@echo "$(GREEN)✅ Cleanup abgeschlossen$(NC)"

## clean-all: Entfernt Container, Volumes und Images
clean-all:
	@echo "$(RED)⚠️  Entferne ALLES (Container, Volumes, Images)...$(NC)"
	docker-compose down -v --rmi all --remove-orphans
	@echo "$(GREEN)✅ Kompletter Reset abgeschlossen$(NC)"

## restart: Startet alle Container neu
restart:
	@echo "$(YELLOW)Starte Container neu...$(NC)"
	docker-compose restart

## logs: Zeigt alle Logs
logs:
	docker-compose logs -f

## health: Prüft Container Health Status
health:
	@echo "$(GREEN)Container Health Status:$(NC)"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

## shell: Öffnet Shell im Production Container
shell:
	@echo "$(GREEN)Öffne Shell im Container...$(NC)"
	docker exec -it rampenlicht-app sh

## shell-dev: Öffnet Shell im Dev Container
shell-dev:
	@echo "$(GREEN)Öffne Shell im Dev Container...$(NC)"
	docker exec -it rampenlicht-dev sh

## test: Testet WebSocket-Verbindung
test:
	@echo "$(GREEN)Teste App Health...$(NC)"
	@curl -s http://localhost:3000/health || echo "$(RED)❌ App nicht erreichbar$(NC)"

## env: Erstellt .env Datei aus Template
env:
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Erstelle .env Datei...$(NC)"; \
		echo "VITE_SUPABASE_URL=https://your-project.supabase.co" > .env; \
		echo "VITE_SUPABASE_ANON_KEY=your_anon_key_here" >> .env; \
		echo "VITE_ENABLE_REALTIME=true" >> .env; \
		echo "$(GREEN)✅ .env erstellt - bitte anpassen!$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  .env existiert bereits$(NC)"; \
	fi

## stats: Zeigt Docker Resource Usage
stats:
	@echo "$(GREEN)Docker Resource Usage:$(NC)"
	docker stats --no-stream

## ps: Zeigt laufende Container
ps:
	@echo "$(GREEN)Laufende Container:$(NC)"
	docker-compose ps


