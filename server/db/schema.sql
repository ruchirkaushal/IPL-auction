-- IPL Auction Game - PostgreSQL Schema
-- Version 1.0
-- Created: May 25, 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ROOMS TABLE - Core auction rooms
-- ============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  host_id VARCHAR(255) NOT NULL,
  state JSONB NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- AUCTION EVENTS TABLE - Audit trail for all bids and state changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS auction_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  player_id VARCHAR(255),
  player_name VARCHAR(255),
  team_id VARCHAR(10),
  team_name VARCHAR(255),
  amount INTEGER,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_room ON auction_events(room_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON auction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON auction_events(timestamp);

-- ============================================================================
-- PLAYER SESSIONS TABLE - Track reconnects and socket mappings
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  socket_id VARCHAR(255),
  last_activity TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  reconnect_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, room_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON player_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room ON player_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON player_sessions(is_active);

-- ============================================================================
-- SNAPSHOTS TABLE - Room state snapshots for recovery
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  current_player_index INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_room ON room_snapshots(room_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON room_snapshots(timestamp);

-- Cleanup old snapshots (keep only last 10 per room)
CREATE OR REPLACE FUNCTION cleanup_old_snapshots() RETURNS void AS $$
BEGIN
  DELETE FROM room_snapshots
  WHERE id NOT IN (
    SELECT id FROM room_snapshots
    ORDER BY timestamp DESC
    LIMIT 10
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATED INDEXES for common queries
-- ============================================================================

-- Fast lookup of active rooms
CREATE INDEX IF NOT EXISTS idx_rooms_active_updated 
ON rooms(updated_at DESC) 
WHERE deleted_at IS NULL;

-- Fast lookup of events by room and type
CREATE INDEX IF NOT EXISTS idx_events_room_type 
ON auction_events(room_id, event_type);

-- ============================================================================
-- MATERIALIZED VIEW - Room statistics
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS room_statistics AS
SELECT 
  r.room_code,
  r.host_id,
  COUNT(DISTINCT ae.id) as total_events,
  COUNT(DISTINCT CASE WHEN ae.event_type = 'bid_placed' THEN ae.id END) as total_bids,
  COUNT(DISTINCT CASE WHEN ae.event_type = 'player_sold' THEN ae.id END) as players_sold,
  COUNT(DISTINCT CASE WHEN ae.event_type = 'player_unsold' THEN ae.id END) as players_unsold,
  SUM(CASE WHEN ae.event_type = 'bid_placed' THEN ae.amount ELSE 0 END) as total_amount_bid,
  r.created_at,
  r.updated_at
FROM rooms r
LEFT JOIN auction_events ae ON r.id = ae.room_id
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.room_code, r.host_id, r.created_at, r.updated_at;

CREATE INDEX IF NOT EXISTS idx_room_stats_code ON room_statistics(room_code);
