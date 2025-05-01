-- PostgreSQL Schema for PCS Draw (AstroWhiteboard)
-- This file defines the database schema for the AstroWhiteboard application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    preferences JSONB DEFAULT '{"theme": "system", "language": "en", "notifications": true}'::jsonb,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC);

-- Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{"isPublic": false, "defaultPermission": "view"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes on workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_updated_at ON workspaces(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);
CREATE INDEX IF NOT EXISTS idx_workspaces_settings_is_public ON workspaces((settings->>'isPublic'));

-- Workspace Members Table
CREATE TABLE IF NOT EXISTS workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id)
);

-- Create indexes on workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

-- Whiteboards Table
CREATE TABLE IF NOT EXISTS whiteboards (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    workspace_id INTEGER NOT NULL,
    thumbnail VARCHAR(255),
    current_version INTEGER DEFAULT 1,
    element_count INTEGER DEFAULT 0,
    encryption_metadata JSONB DEFAULT '{"algorithm": "AES-GCM", "keyEncrypted": true}'::jsonb,
    tags TEXT[],
    is_archived BOOLEAN DEFAULT FALSE,
    created_by INTEGER NOT NULL,
    created_by_name VARCHAR(255), -- Denormalized for performance
    created_by_avatar VARCHAR(255), -- Denormalized for performance
    last_edited_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_last_edited_by FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes on whiteboards
CREATE INDEX IF NOT EXISTS idx_whiteboards_workspace_id ON whiteboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whiteboards_workspace_updated ON whiteboards(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_whiteboards_created_by ON whiteboards(created_by);
CREATE INDEX IF NOT EXISTS idx_whiteboards_is_archived ON whiteboards(is_archived);
CREATE INDEX IF NOT EXISTS idx_whiteboards_name ON whiteboards(name);
CREATE INDEX IF NOT EXISTS idx_whiteboards_tags ON whiteboards USING GIN(tags);

-- Whiteboard Versions Table
CREATE TABLE IF NOT EXISTS whiteboard_versions (
    id SERIAL PRIMARY KEY,
    whiteboard_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    data JSONB NOT NULL,
    delta JSONB,
    thumbnail VARCHAR(255),
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_whiteboard FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_whiteboard_version UNIQUE (whiteboard_id, version)
);

-- Create indexes on whiteboard_versions
CREATE INDEX IF NOT EXISTS idx_whiteboard_versions_whiteboard_id ON whiteboard_versions(whiteboard_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_versions_whiteboard_version ON whiteboard_versions(whiteboard_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_whiteboard_versions_created_by ON whiteboard_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_whiteboard_versions_created_at ON whiteboard_versions(created_at DESC);

-- Whiteboard Elements Table
CREATE TABLE IF NOT EXISTS whiteboard_elements (
    id SERIAL PRIMARY KEY,
    whiteboard_id INTEGER NOT NULL,
    version_id INTEGER,
    element_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('rectangle', 'circle', 'text', 'arrow', 'line', 'freehand', 'image')),
    properties JSONB NOT NULL,
    z_index INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_whiteboard FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE,
    CONSTRAINT fk_version FOREIGN KEY (version_id) REFERENCES whiteboard_versions(id) ON DELETE SET NULL,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_whiteboard_element UNIQUE (whiteboard_id, element_id)
);

-- Create indexes on whiteboard_elements
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_whiteboard_id ON whiteboard_elements(whiteboard_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_version_id ON whiteboard_elements(version_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_type ON whiteboard_elements(whiteboard_id, type);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_z_index ON whiteboard_elements(whiteboard_id, z_index);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_is_deleted ON whiteboard_elements(whiteboard_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_created_by ON whiteboard_elements(created_by);

-- Collaboration Sessions Table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id SERIAL PRIMARY KEY,
    whiteboard_id INTEGER NOT NULL,
    active_users JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_whiteboard FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE
);

-- Create indexes on collaboration_sessions
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_whiteboard_id ON collaboration_sessions(whiteboard_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_last_activity ON collaboration_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active_users ON collaboration_sessions USING GIN(active_users);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('user', 'workspace', 'whiteboard')),
    entity_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'share', 'view', 'export')),
    user_id INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes on activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whiteboards_updated_at
BEFORE UPDATE ON whiteboards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whiteboard_elements_updated_at
BEFORE UPDATE ON whiteboard_elements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to update whiteboard element count
CREATE OR REPLACE FUNCTION update_whiteboard_element_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE whiteboards
        SET element_count = element_count + 1
        WHERE id = NEW.whiteboard_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE whiteboards
        SET element_count = element_count - 1
        WHERE id = OLD.whiteboard_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update the whiteboard element count
CREATE TRIGGER update_whiteboard_element_count_insert
AFTER INSERT ON whiteboard_elements
FOR EACH ROW
WHEN (NEW.is_deleted = FALSE)
EXECUTE FUNCTION update_whiteboard_element_count();

CREATE TRIGGER update_whiteboard_element_count_delete
AFTER DELETE ON whiteboard_elements
FOR EACH ROW
WHEN (OLD.is_deleted = FALSE)
EXECUTE FUNCTION update_whiteboard_element_count();

-- Create a function to handle soft delete of elements
CREATE OR REPLACE FUNCTION handle_element_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        UPDATE whiteboards
        SET element_count = element_count - 1
        WHERE id = NEW.whiteboard_id;
    ELSIF NEW.is_deleted = FALSE AND OLD.is_deleted = TRUE THEN
        UPDATE whiteboards
        SET element_count = element_count + 1
        WHERE id = NEW.whiteboard_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for soft delete
CREATE TRIGGER handle_element_soft_delete_trigger
BEFORE UPDATE ON whiteboard_elements
FOR EACH ROW
WHEN (NEW.is_deleted IS DISTINCT FROM OLD.is_deleted)
EXECUTE FUNCTION handle_element_soft_delete();

-- Create a function to update the current version of a whiteboard
CREATE OR REPLACE FUNCTION update_whiteboard_current_version()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE whiteboards
    SET current_version = NEW.version
    WHERE id = NEW.whiteboard_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update current version
CREATE TRIGGER update_whiteboard_current_version_trigger
AFTER INSERT ON whiteboard_versions
FOR EACH ROW
EXECUTE FUNCTION update_whiteboard_current_version();

-- Create a function to update last_edited_by in whiteboard
CREATE OR REPLACE FUNCTION update_whiteboard_last_edited()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE whiteboards
    SET 
        last_edited_by = NEW.created_by,
        updated_at = NOW()
    WHERE id = NEW.whiteboard_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last edited
CREATE TRIGGER update_whiteboard_last_edited_trigger
AFTER INSERT ON whiteboard_versions
FOR EACH ROW
EXECUTE FUNCTION update_whiteboard_last_edited();

-- Create a view for workspace members with user details
CREATE OR REPLACE VIEW workspace_members_view AS
SELECT 
    wm.id,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.joined_at,
    u.name AS user_name,
    u.email AS user_email,
    u.avatar AS user_avatar,
    u.last_active AS user_last_active
FROM 
    workspace_members wm
JOIN 
    users u ON wm.user_id = u.id
WHERE 
    u.is_deleted = FALSE;

-- Create a view for whiteboard summary
CREATE OR REPLACE VIEW whiteboard_summary AS
SELECT 
    w.id,
    w.uuid,
    w.name,
    w.workspace_id,
    w.thumbnail,
    w.current_version,
    w.element_count,
    w.tags,
    w.is_archived,
    w.created_by,
    w.created_by_name,
    w.created_by_avatar,
    w.last_edited_by,
    u.name AS last_edited_by_name,
    w.created_at,
    w.updated_at,
    ws.name AS workspace_name,
    ws.owner_id AS workspace_owner_id
FROM 
    whiteboards w
LEFT JOIN 
    users u ON w.last_edited_by = u.id
JOIN 
    workspaces ws ON w.workspace_id = ws.id;

-- Create a function to clean up old activity logs
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM activity_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old collaboration sessions
CREATE OR REPLACE FUNCTION cleanup_old_collaboration_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM collaboration_sessions
    WHERE last_activity < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;