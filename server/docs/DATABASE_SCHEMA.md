# PCS Draw Database Schema

This document outlines the database schema for the PCS Draw application. The application uses PostgreSQL as its primary database.

## Table of Contents

1. [Users](#users)
2. [Workspaces](#workspaces)
3. [Workspace Members](#workspace-members)
4. [Whiteboards](#whiteboards)
5. [Whiteboard Versions](#whiteboard-versions)
6. [Whiteboard Elements](#whiteboard-elements)
7. [Collaboration Sessions](#collaboration-sessions)
8. [Entity Relationship Diagram](#entity-relationship-diagram)

## Users

The `users` table stores user account information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| uuid | UUID | Unique identifier (for public APIs) |
| email | VARCHAR(255) | User's email address (unique) |
| password | VARCHAR(255) | Hashed password |
| name | VARCHAR(255) | User's display name |
| avatar | TEXT | URL to user's avatar image |
| preferences | JSONB | User preferences (theme, language, etc.) |
| last_active | TIMESTAMP | Last activity timestamp |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

**Indexes:**
- `users_email_key` (UNIQUE) on `email`
- `users_uuid_key` (UNIQUE) on `uuid`

## Workspaces

The `workspaces` table stores workspace information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| uuid | UUID | Unique identifier (for public APIs) |
| name | VARCHAR(255) | Workspace name |
| description | TEXT | Workspace description |
| owner_id | INTEGER | Reference to users.id |
| settings | JSONB | Workspace settings (isPublic, defaultPermission, etc.) |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

**Indexes:**
- `workspaces_owner_id_idx` on `owner_id`
- `workspaces_uuid_key` (UNIQUE) on `uuid`

**Foreign Keys:**
- `owner_id` references `users(id)` ON DELETE CASCADE

## Workspace Members

The `workspace_members` table stores workspace membership information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| workspace_id | INTEGER | Reference to workspaces.id |
| user_id | INTEGER | Reference to users.id |
| role | VARCHAR(50) | Member role (viewer, editor, admin) |
| joined_at | TIMESTAMP | Timestamp when user joined workspace |

**Indexes:**
- `workspace_members_workspace_id_user_id_key` (UNIQUE) on `(workspace_id, user_id)`
- `workspace_members_user_id_idx` on `user_id`

**Foreign Keys:**
- `workspace_id` references `workspaces(id)` ON DELETE CASCADE
- `user_id` references `users(id)` ON DELETE CASCADE

## Whiteboards

The `whiteboards` table stores whiteboard information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| uuid | UUID | Unique identifier (for public APIs) |
| name | VARCHAR(255) | Whiteboard name |
| workspace_id | INTEGER | Reference to workspaces.id |
| thumbnail | TEXT | URL or base64 of whiteboard thumbnail |
| current_version | INTEGER | Current version number |
| current_version_id | INTEGER | Reference to whiteboard_versions.id |
| element_count | INTEGER | Number of elements in whiteboard |
| tags | TEXT[] | Array of tags |
| encryption_metadata | JSONB | Encryption metadata (if encrypted) |
| is_archived | BOOLEAN | Archive flag |
| created_by | INTEGER | Reference to users.id who created the whiteboard |
| created_by_name | VARCHAR(255) | Name of creator (denormalized) |
| created_by_avatar | TEXT | Avatar of creator (denormalized) |
| last_edited_by | INTEGER | Reference to users.id who last edited |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

**Indexes:**
- `whiteboards_workspace_id_idx` on `workspace_id`
- `whiteboards_created_by_idx` on `created_by`
- `whiteboards_uuid_key` (UNIQUE) on `uuid`
- `whiteboards_tags_idx` GIN index on `tags`

**Foreign Keys:**
- `workspace_id` references `workspaces(id)` ON DELETE CASCADE
- `created_by` references `users(id)` ON DELETE SET NULL
- `last_edited_by` references `users(id)` ON DELETE SET NULL
- `current_version_id` references `whiteboard_versions(id)` ON DELETE SET NULL

## Whiteboard Versions

The `whiteboard_versions` table stores version history for whiteboards.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| whiteboard_id | INTEGER | Reference to whiteboards.id |
| version | INTEGER | Version number |
| data | JSONB | Complete whiteboard data |
| delta | JSONB | Changes from previous version |
| thumbnail | TEXT | URL or base64 of version thumbnail |
| created_by | INTEGER | Reference to users.id |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Record creation timestamp |

**Indexes:**
- `whiteboard_versions_whiteboard_id_version_key` (UNIQUE) on `(whiteboard_id, version)`
- `whiteboard_versions_created_by_idx` on `created_by`

**Foreign Keys:**
- `whiteboard_id` references `whiteboards(id)` ON DELETE CASCADE
- `created_by` references `users(id)` ON DELETE SET NULL

## Whiteboard Elements

The `whiteboard_elements` table stores individual elements within a whiteboard.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| whiteboard_id | INTEGER | Reference to whiteboards.id |
| version_id | INTEGER | Reference to whiteboard_versions.id |
| element_id | VARCHAR(255) | Client-generated element ID |
| type | VARCHAR(50) | Element type (rectangle, circle, text, etc.) |
| properties | JSONB | Element properties |
| z_index | INTEGER | Z-index for layering |
| is_deleted | BOOLEAN | Soft delete flag |
| created_by | INTEGER | Reference to users.id |
| updated_by | INTEGER | Reference to users.id |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

**Indexes:**
- `whiteboard_elements_whiteboard_id_element_id_key` (UNIQUE) on `(whiteboard_id, element_id)`
- `whiteboard_elements_version_id_idx` on `version_id`
- `whiteboard_elements_type_idx` on `type`

**Foreign Keys:**
- `whiteboard_id` references `whiteboards(id)` ON DELETE CASCADE
- `version_id` references `whiteboard_versions(id)` ON DELETE SET NULL
- `created_by` references `users(id)` ON DELETE SET NULL
- `updated_by` references `users(id)` ON DELETE SET NULL

## Collaboration Sessions

The `collaboration_sessions` table tracks active collaboration sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| whiteboard_id | INTEGER | Reference to whiteboards.id |
| active_users | JSONB | Array of active users with their status |
| started_at | TIMESTAMP | Session start timestamp |
| last_activity | TIMESTAMP | Last activity timestamp |

**Indexes:**
- `collaboration_sessions_whiteboard_id_key` (UNIQUE) on `whiteboard_id`
- `collaboration_sessions_last_activity_idx` on `last_activity`

**Foreign Keys:**
- `whiteboard_id` references `whiteboards(id)` ON DELETE CASCADE

## Entity Relationship Diagram

```
+----------------+       +-------------------+       +----------------+
|     Users      |       | Workspace Members |       |   Workspaces   |
+----------------+       +-------------------+       +----------------+
| id             |<----->| user_id           |       | id             |
| uuid           |       | workspace_id      |<----->| uuid           |
| email          |       | role              |       | name           |
| password       |       | joined_at         |       | description    |
| name           |       +-------------------+       | owner_id       |<----+
| avatar         |                                   | settings       |     |
| preferences    |                                   | created_at     |     |
| last_active    |                                   | updated_at     |     |
| is_deleted     |                                   +----------------+     |
| created_at     |                                                          |
| updated_at     |                                                          |
+----------------+                                                          |
       ^                                                                    |
       |                                                                    |
       +--------------------------------------------------------------------+
       |
       |
       |                 +----------------------+
       |                 |     Whiteboards     |
       |                 +----------------------+
       +---------------->| id                   |
       |                 | uuid                 |
       |                 | name                 |
       |                 | workspace_id         |<----+
       |                 | thumbnail            |     |
       |                 | current_version      |     |
       |                 | current_version_id   |<-+  |
       |                 | element_count        |  |  |
       |                 | tags                 |  |  |
       |                 | encryption_metadata  |  |  |
       |                 | is_archived          |  |  |
       +---------------->| created_by           |  |  |
       |                 | created_by_name      |  |  |
       |                 | created_by_avatar    |  |  |
       +---------------->| last_edited_by       |  |  |
                         | created_at           |  |  |
                         | updated_at           |  |  |
                         +----------------------+  |  |
                                  ^                |  |
                                  |                |  |
                                  |                |  |
                                  |                |  |
+----------------+      +----------------------+  |  |
| Collaboration  |      | Whiteboard Versions  |  |  |
| Sessions       |      +----------------------+  |  |
+----------------+      | id                   |<-+  |
| id             |      | whiteboard_id        |<----+
| whiteboard_id  |<-----| version              |     |
| active_users   |      | data                 |     |
| started_at     |      | delta                |     |
| last_activity  |      | thumbnail            |     |
+----------------+      | created_by           |<----+
                        | metadata             |     |
                        | created_at           |     |
                        +----------------------+     |
                                 ^                   |
                                 |                   |
                                 |                   |
                        +----------------------+     |
                        | Whiteboard Elements  |     |
                        +----------------------+     |
                        | id                   |     |
                        | whiteboard_id        |<----+
                        | version_id           |<----+
                        | element_id           |
                        | type                 |
                        | properties           |
                        | z_index              |
                        | is_deleted           |
                        | created_by           |<----+
                        | updated_by           |<----+
                        | created_at           |
                        | updated_at           |
                        +----------------------+
```

## Database Migrations

Database migrations are managed using a migration tool. The migrations directory contains all the migration files that create and modify the database schema.

## Indexes and Performance

The database schema includes carefully chosen indexes to optimize query performance:

1. Primary keys are automatically indexed
2. Foreign keys are indexed to speed up joins
3. UUID fields are indexed for fast lookups
4. Composite indexes are used for frequently queried combinations
5. GIN indexes are used for array and JSONB fields that are queried

## Data Integrity

The database schema enforces data integrity through:

1. Foreign key constraints with appropriate cascade actions
2. NOT NULL constraints on required fields
3. UNIQUE constraints to prevent duplicates
4. CHECK constraints to enforce valid values
5. Default values for optional fields

## Transactions

The application uses database transactions to ensure data consistency, especially for operations that affect multiple tables.

## Connection Pooling

The database connection is managed using a connection pool to efficiently handle multiple concurrent requests.

## Backup and Recovery

Regular database backups are configured to prevent data loss. The backup strategy includes:

1. Daily full backups
2. Point-in-time recovery using WAL (Write-Ahead Logging)
3. Backup retention policy
4. Backup verification procedures