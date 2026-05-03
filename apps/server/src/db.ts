/**
 * SQLite persistence for projects, conversations, and messages.
 *
 * Ported from @open-design/daemon/src/db.ts, adapted for Open Video.
 * The filesystem remains the owner of actual project files (HTML, MP4);
 * this database tracks metadata, conversations, and messages.
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

let dbInstance: Database.Database | null = null;
let dbFile: string | null = null;

export function openDatabase(projectRoot: string, opts?: { dataDir?: string }): Database.Database {
  const dir = opts?.dataDir ? path.resolve(opts.dataDir) : path.join(projectRoot, '.ov');
  const file = path.join(dir, 'app.sqlite');
  if (dbInstance && dbFile === file) return dbInstance;
  if (dbInstance) closeDatabase();
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  dbInstance = db;
  dbFile = file;
  return db;
}

export function closeDatabase(): void {
  if (!dbInstance) return;
  dbInstance.close();
  dbInstance = null;
  dbFile = null;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}',
      skill_id TEXT,
      motion_system_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_conv_project
      ON conversations(project_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      agent_id TEXT,
      agent_name TEXT,
      produced_files_json TEXT,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv
      ON messages(conversation_id, position);
  `);
}

// ── Projects ─────────────────────────────────────────────────────────

export interface DbProject {
  id: string;
  name: string;
  configJson: string;
  skillId: string | null;
  motionSystemId: string | null;
  createdAt: number;
  updatedAt: number;
}

export function insertProject(
  db: Database.Database,
  p: { name: string; config?: Record<string, unknown>; skillId?: string; motionSystemId?: string },
): DbProject {
  const now = Date.now();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO projects (id, name, config_json, skill_id, motion_system_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, p.name, JSON.stringify(p.config ?? {}), p.skillId ?? null, p.motionSystemId ?? null, now, now);
  return getProject(db, id)!;
}

export function getProject(db: Database.Database, id: string): DbProject | null {
  const row = db.prepare(
    `SELECT id, name, config_json AS configJson, skill_id AS skillId,
            motion_system_id AS motionSystemId, created_at AS createdAt, updated_at AS updatedAt
     FROM projects WHERE id = ?`,
  ).get(id) as DbProject | undefined;
  return row ?? null;
}

export function listProjects(db: Database.Database): DbProject[] {
  return db.prepare(
    `SELECT id, name, config_json AS configJson, skill_id AS skillId,
            motion_system_id AS motionSystemId, created_at AS createdAt, updated_at AS updatedAt
     FROM projects ORDER BY updated_at DESC`,
  ).all() as DbProject[];
}

export function updateProject(
  db: Database.Database,
  id: string,
  patch: { name?: string; config?: Record<string, unknown>; skillId?: string | null; motionSystemId?: string | null },
): DbProject | null {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.config !== undefined) { sets.push('config_json = ?'); vals.push(JSON.stringify(patch.config)); }
  if (patch.skillId !== undefined) { sets.push('skill_id = ?'); vals.push(patch.skillId); }
  if (patch.motionSystemId !== undefined) { sets.push('motion_system_id = ?'); vals.push(patch.motionSystemId); }
  if (sets.length === 0) return getProject(db, id);
  sets.push('updated_at = ?');
  vals.push(Date.now(), id);
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return getProject(db, id);
}

export function deleteProject(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Conversations ────────────────────────────────────────────────────

export interface DbConversation {
  id: string;
  projectId: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
}

export function insertConversation(
  db: Database.Database,
  c: { projectId: string; title?: string },
): DbConversation {
  const now = Date.now();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO conversations (id, project_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, c.projectId, c.title ?? null, now, now);
  return getConversation(db, id)!;
}

export function getConversation(db: Database.Database, id: string): DbConversation | null {
  const row = db.prepare(
    `SELECT id, project_id AS projectId, title, created_at AS createdAt, updated_at AS updatedAt
     FROM conversations WHERE id = ?`,
  ).get(id) as DbConversation | undefined;
  return row ?? null;
}

export function listConversations(
  db: Database.Database,
  projectId: string,
): DbConversation[] {
  return db.prepare(
    `SELECT id, project_id AS projectId, title, created_at AS createdAt, updated_at AS updatedAt
     FROM conversations WHERE project_id = ? ORDER BY updated_at DESC`,
  ).all(projectId) as DbConversation[];
}

export function deleteConversation(db: Database.Database, id: string): boolean {
  return db.prepare('DELETE FROM conversations WHERE id = ?').run(id).changes > 0;
}

// ── Messages ─────────────────────────────────────────────────────────

export interface DbMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId: string | null;
  agentName: string | null;
  producedFilesJson: string | null;
  position: number;
  createdAt: number;
}

export function insertMessage(
  db: Database.Database,
  m: { conversationId: string; role: string; content: string; agentId?: string; agentName?: string; producedFiles?: string[] },
): DbMessage {
  const now = Date.now();
  const id = randomUUID();

  // Get next position
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM messages WHERE conversation_id = ?',
  ).get(m.conversationId) as { next: number };

  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, agent_id, agent_name,
                           produced_files_json, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, m.conversationId, m.role, m.content,
    m.agentId ?? null, m.agentName ?? null,
    m.producedFiles ? JSON.stringify(m.producedFiles) : null,
    maxPos.next, now,
  );

  // Update conversation timestamp
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, m.conversationId);

  return getMessage(db, id)!;
}

export function getMessage(db: Database.Database, id: string): DbMessage | null {
  const row = db.prepare(
    `SELECT id, conversation_id AS conversationId, role, content,
            agent_id AS agentId, agent_name AS agentName,
            produced_files_json AS producedFilesJson,
            position, created_at AS createdAt
     FROM messages WHERE id = ?`,
  ).get(id) as DbMessage | undefined;
  return row ?? null;
}

export function listMessages(
  db: Database.Database,
  conversationId: string,
): DbMessage[] {
  return db.prepare(
    `SELECT id, conversation_id AS conversationId, role, content,
            agent_id AS agentId, agent_name AS agentName,
            produced_files_json AS producedFilesJson,
            position, created_at AS createdAt
     FROM messages WHERE conversation_id = ? ORDER BY position`,
  ).all(conversationId) as DbMessage[];
}

export function updateMessageContent(db: Database.Database, id: string, content: string): void {
  db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id);
}
