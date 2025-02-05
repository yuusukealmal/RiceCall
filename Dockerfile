FROM rust:1.83-slim-bookworm AS builder

WORKDIR /usr/src/app
COPY . .

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

ENV DATABASE_URL=sqlite:/tmp/bot.db
RUN cargo install sqlx-cli && \
    sqlx database create && \
    sqlx migrate run --source migrations

RUN cargo build --release

# Use distroless as runtime image
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

COPY --from=builder /usr/src/app/target/release/chat-server /app/

ENV DATABASE_URL=sqlite:data/db.sqlite3

VOLUME ["/app/data"]
USER nonroot

ENTRYPOINT ["/app/chat-server", "-c", "/app/data/config.yaml"] 