.PHONY: dev dev-down logs \
        backend-shell backend-test backend-lint \
        frontend-shell frontend-build \
        db-migrate db-reset db-seed db-types \
        prod-up prod-down \
        clean

# =============================================================================
# Desenvolvimento
# =============================================================================

## Inicia todos os serviços em modo desenvolvimento (com build)
dev:
	docker-compose up --build

## Para todos os serviços de desenvolvimento
dev-down:
	docker-compose down

## Mostra logs em tempo real de todos os serviços
logs:
	docker-compose logs -f

# =============================================================================
# Backend
# =============================================================================

## Abre shell bash dentro do container backend
backend-shell:
	docker-compose exec backend bash

## Corre os testes do backend com output verbose
backend-test:
	docker-compose exec backend pytest -v

## Corre o linter ruff no código backend
backend-lint:
	docker-compose exec backend ruff check .

# =============================================================================
# Frontend
# =============================================================================

## Abre shell sh dentro do container frontend
frontend-shell:
	docker-compose exec frontend sh

## Executa o build de produção do Next.js
frontend-build:
	docker-compose exec frontend npm run build

# =============================================================================
# Base de Dados (Supabase)
# =============================================================================

## Aplica as migrations pendentes na base de dados
db-migrate:
	supabase db push

## Reinicia a base de dados local (apaga todos os dados)
db-reset:
	supabase db reset

## Reinicia a base de dados e aplica seeds de teste
db-seed:
	supabase db reset --with-seed

## Gera os tipos TypeScript a partir do schema da base de dados
db-types:
	supabase gen types typescript --local > frontend/types/supabase.ts

# =============================================================================
# Produção
# =============================================================================

## Inicia os serviços em modo produção (background)
prod-up:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

## Para os serviços de produção
prod-down:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# =============================================================================
# Utilitários
# =============================================================================

## Remove containers, imagens e volumes Docker não utilizados
clean:
	docker system prune -f
