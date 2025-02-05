-- Add migration script here
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account TEXT UNIQUE,
    password TEXT,
    gender TEXT,
    permissions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    announcement TEXT,
    icon TEXT,
    users TEXT NOT NULL,
    channels TEXT NOT NULL,
    messages TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permission TEXT NOT NULL,
    is_lobby BOOLEAN NOT NULL,
    is_category BOOLEAN NOT NULL,
    users TEXT NOT NULL,
    parent_id TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);