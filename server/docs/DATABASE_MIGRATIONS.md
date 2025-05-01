# Database Migrations Guide

This document explains how to work with database migrations in the PCS Draw application. Migrations allow you to evolve your database schema over time while keeping track of changes.

## Table of Contents

1. [Introduction](#introduction)
2. [Migration Tool](#migration-tool)
3. [Migration Files](#migration-files)
4. [Running Migrations](#running-migrations)
5. [Creating Migrations](#creating-migrations)
6. [Rolling Back Migrations](#rolling-back-migrations)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Introduction

Database migrations are a way to apply version control to your database schema. They allow you to:

- Track changes to your database schema
- Apply changes consistently across different environments
- Roll back changes if needed
- Collaborate with other developers without conflicts

## Migration Tool

PCS Draw uses [node-pg-migrate](https://github.com/salsita/node-pg-migrate) for database migrations. This tool provides a simple way to create and run migrations for PostgreSQL databases.

## Migration Files

Migration files are stored in the `migrations` directory. Each migration file has a name that includes a timestamp and a description of the change.

Example migration file structure:

```
migrations/
├── 1623744000000_create_users_table.js
├── 1623744100000_create_workspaces_table.js
├── 1623744200000_create_workspace_members_table.js
├── 1623744300000_create_whiteboards_table.js
└── 1623744400000_create_whiteboard_versions_table.js
```

Each migration file exports an `up` function and a `down` function:

- The `up` function applies the migration
- The `down` function reverts the migration

Example migration file:

```javascript
/* Migration file: 1623744000000_create_users_table.js */

exports.up = pgm => {
  pgm.createTable('users', {
    id: 'id',
    uuid: {
      type: 'uuid',
      notNull: true,
      default: pgm.func('uuid_generate_v4()')
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    password: {
      type: 'varchar(255)',
      notNull: true
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    avatar: {
      type: 'text'
    },
    preferences: {
      type: 'jsonb',
      default: '{}'
    },
    last_active: {
      type: 'timestamp'
    },
    is_deleted: {
      type: 'boolean',
      default: false
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create indexes
  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'uuid', { unique: true });

  // Create extension for UUID generation if it doesn't exist
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
};

exports.down = pgm => {
  pgm.dropTable('users');
};
```

## Running Migrations

To run all pending migrations:

```bash
npm run migrate
```

This command will apply all migrations that haven't been applied yet.

To run migrations up to a specific migration:

```bash
npm run migrate -- --to 1623744200000
```

To run a specific number of migrations:

```bash
npm run migrate -- --count 2
```

## Creating Migrations

To create a new migration:

```bash
npm run migrate:create -- create_new_table
```

This will create a new migration file with a timestamp and the name you provided.

Example output:

```
Created migration -- /home/user/pcsdraw/server/migrations/1623744500000_create_new_table.js
```

## Rolling Back Migrations

To roll back the most recent migration:

```bash
npm run migrate:down
```

To roll back a specific number of migrations:

```bash
npm run migrate:down -- --count 2
```

To roll back all migrations:

```bash
npm run migrate:down -- --to 0
```

## Best Practices

### 1. Keep Migrations Small and Focused

Each migration should do one thing and do it well. This makes it easier to understand, test, and roll back if needed.

Good examples:
- Create a table
- Add a column to a table
- Create an index

Bad examples:
- Create multiple tables with complex relationships
- Make schema changes and insert data in the same migration

### 2. Make Migrations Idempotent

Migrations should be idempotent, meaning they can be run multiple times without changing the result beyond the first run.

Example:

```javascript
exports.up = pgm => {
  // Check if the column exists before adding it
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'avatar'
      ) THEN
        ALTER TABLE users ADD COLUMN avatar text;
      END IF;
    END $$;
  `);
};
```

### 3. Always Include Down Migrations

Always implement the `down` function to revert the changes made in the `up` function. This allows you to roll back migrations if needed.

### 4. Test Migrations Before Applying to Production

Always test migrations in a development or staging environment before applying them to production.

### 5. Back Up the Database Before Running Migrations

Always back up your production database before running migrations.

### 6. Use Transactions

Wrap complex migrations in transactions to ensure they are atomic.

Example:

```javascript
exports.up = pgm => {
  pgm.createTable('table1', { /* ... */ });
  pgm.createTable('table2', { /* ... */ });
  pgm.addConstraint('table2', 'fk_table1', {
    foreignKeys: {
      columns: 'table1_id',
      references: 'table1(id)'
    }
  });
};
```

The migration tool automatically wraps each migration in a transaction.

### 7. Document Complex Migrations

Add comments to explain complex migrations, especially those that involve data transformations.

## Troubleshooting

### Migration Failed

If a migration fails, the migration tool will stop and display an error message. The database will be left in a partially migrated state.

To fix this:

1. Check the error message to understand what went wrong
2. Fix the issue in the migration file
3. Run the migration again

### Migration Conflicts

If multiple developers create migrations with the same timestamp, conflicts can occur. To avoid this:

1. Always pull the latest changes before creating a new migration
2. If conflicts occur, rename one of the migration files to have a different timestamp

### Reverting Failed Migrations

If a migration fails and you need to revert it:

1. Fix any data issues that may have been caused by the failed migration
2. Run `npm run migrate:down` to roll back the migration
3. Fix the migration file
4. Run `npm run migrate` to apply the fixed migration

### Checking Migration Status

To check which migrations have been applied:

```bash
npm run migrate:status
```

This will show a list of all migrations and whether they have been applied.

## Conclusion

Database migrations are a powerful tool for managing your database schema. By following the guidelines in this document, you can ensure that your database evolves smoothly as your application grows.