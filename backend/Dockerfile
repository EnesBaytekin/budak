# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /tudo ./cmd/tudo

# Run stage
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /tudo .
COPY internal/db/migrations ./internal/db/migrations

EXPOSE 8080
CMD ["./tudo"]
