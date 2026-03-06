.PHONY: run build tidy dev

## Install dependencies
tidy:
	go mod tidy

## Run in development mode
dev:
	GIN_MODE=debug go run ./cmd/main.go

## Build production binary
build:
	go build -o bin/portfolio ./cmd/main.go

## Run built binary
run: build
	./bin/portfolio

## Generate a secure JWT_SECRET
gen-secret:
	openssl rand -hex 32
