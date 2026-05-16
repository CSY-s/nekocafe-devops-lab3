.PHONY: up down build lint test smoke logs

up:
	docker compose up -d --build

down:
	docker compose down -v

build:
	docker compose build

lint:
	python -c "import ast,pathlib; ast.parse(pathlib.Path('services/reservation/src/main.py').read_text(encoding='utf-8'))"
	node --check services/member/src/index.js
	node --check services/frontend/server.js
	node --check services/frontend/public/app.js

test:
	python -B -m unittest discover -s services/reservation/tests -p "test_*.py"
	cd services/member && npm test
	cd services/frontend && npm test

smoke:
	curl -fsS http://localhost:8080
	curl -fsS http://localhost:8081/healthz
	curl -fsS http://localhost:8082/healthz

logs:
	docker compose logs -f --tail=100
