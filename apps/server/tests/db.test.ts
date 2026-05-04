import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDatabase, closeDatabase, insertProject, getProject, listProjects, deleteProject, insertConversation, listConversations, insertMessage, listMessages, updateProject } from '../src/db.js';
import type Database from 'better-sqlite3';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('db', () => {
  let db: Database.Database;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'ov-test-'));
  });

  afterAll(() => {
    closeDatabase();
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('opens a database and creates tables', () => {
    db = openDatabase(tmpDir, { dataDir: path.join(tmpDir, '.ov') });
    // Tables should exist (no error on query)
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const names = tables.map((r: unknown) => (r as { name: string }).name);
    expect(names).toContain('projects');
    expect(names).toContain('conversations');
    expect(names).toContain('messages');
  });

  it('inserts and retrieves a project', () => {
    const project = insertProject(db, {
      name: 'Test Project',
      config: { videoType: 'social-short', orientation: '9:16', duration: 8 },
      motionSystemId: 'tech',
    });
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('Test Project');
    expect(project.motionSystemId).toBe('tech');

    const config = JSON.parse(project.configJson);
    expect(config.videoType).toBe('social-short');

    const retrieved = getProject(db, project.id);
    expect(retrieved).toBeTruthy();
    expect(retrieved!.name).toBe('Test Project');
  });

  it('lists all projects ordered by updated_at desc', () => {
    insertProject(db, { name: 'Newer Project' });
    const projects = listProjects(db);
    expect(projects.length).toBeGreaterThanOrEqual(2);
    expect(projects[0].name).toBe('Newer Project');
  });

  it('updates a project', () => {
    const project = insertProject(db, { name: 'Old Name' });
    const updated = updateProject(db, project.id, { name: 'Updated Name', skillId: 'product-launch-video' });
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.skillId).toBe('product-launch-video');
  });

  it('deletes a project and cascades', () => {
    const project = insertProject(db, { name: 'To Delete' });
    const conv = insertConversation(db, { projectId: project.id, title: 'Test conv' });
    insertMessage(db, { conversationId: conv.id, role: 'user', content: 'Hello' });

    const deleted = deleteProject(db, project.id);
    expect(deleted).toBe(true);

    // Project should be gone
    expect(getProject(db, project.id)).toBeNull();

    // Conversations should cascade delete
    const convs = listConversations(db, project.id);
    expect(convs.length).toBe(0);
  });

  it('inserts and lists conversations', () => {
    const project = insertProject(db, { name: 'Conv Test' });
    const conv1 = insertConversation(db, { projectId: project.id, title: 'First' });
    const conv2 = insertConversation(db, { projectId: project.id, title: 'Second' });

    const convs = listConversations(db, project.id);
    expect(convs.length).toBe(2);
    // Both conversations should be present
    const ids = convs.map(c => c.id);
    expect(ids).toContain(conv1.id);
    expect(ids).toContain(conv2.id);
  });

  it('inserts and lists messages in order', () => {
    const project = insertProject(db, { name: 'Msg Test' });
    const conv = insertConversation(db, { projectId: project.id });
    insertMessage(db, { conversationId: conv.id, role: 'user', content: 'First msg' });
    insertMessage(db, { conversationId: conv.id, role: 'assistant', content: 'Response', agentId: 'claude', agentName: 'Claude Code' });

    const msgs = listMessages(db, conv.id);
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('First msg');
    expect(msgs[1].role).toBe('assistant');
    expect(msgs[1].agentName).toBe('Claude Code');
  });

  it('positions messages sequentially', () => {
    const project = insertProject(db, { name: 'Pos Test' });
    const conv = insertConversation(db, { projectId: project.id });
    const m1 = insertMessage(db, { conversationId: conv.id, role: 'user', content: 'A' });
    const m2 = insertMessage(db, { conversationId: conv.id, role: 'assistant', content: 'B' });
    const m3 = insertMessage(db, { conversationId: conv.id, role: 'user', content: 'C' });

    expect(m1.position).toBe(0);
    expect(m2.position).toBe(1);
    expect(m3.position).toBe(2);
  });

  it('returns null for non-existent project', () => {
    expect(getProject(db, 'nonexistent-id')).toBeNull();
  });
});
