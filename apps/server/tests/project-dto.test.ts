import { describe, expect, it } from 'vitest';
import { pipelineDto, projectDto } from '../src/server.js';
import type { DbProject } from '../src/db.js';

describe('project DTO', () => {
  it('returns parsed config and hides configJson from API shape', () => {
    const dto = projectDto({
      id: 'project-1',
      name: 'Test',
      configJson: '{"videoType":"social-short","orientation":"9:16","duration":8}',
      skillId: null,
      motionSystemId: 'tech',
      createdAt: 1,
      updatedAt: 2,
    } satisfies DbProject);

    expect(dto.config.videoType).toBe('social-short');
    expect(dto.config.orientation).toBe('9:16');
    expect('configJson' in dto).toBe(false);
  });

  it('falls back to empty config for invalid JSON', () => {
    const dto = projectDto({
      id: 'project-2',
      name: 'Broken',
      configJson: '{bad json',
      skillId: null,
      motionSystemId: null,
      createdAt: 1,
      updatedAt: 1,
    } satisfies DbProject);

    expect(dto.config).toEqual({});
  });
});

describe('pipeline DTO', () => {
  it('exposes check and render state for frontend production workflow', () => {
    const dto = pipelineDto({
      id: 'job-1',
      projectId: 'project-1',
      brief: 'test brief',
      status: 'checking',
      scenes: [{ number: 1, html: '<div></div>', duration: 4, status: 'done' }],
      script: {
        title: 'Storyboard',
        duration: 4,
        aspectRatio: '16:9',
        scenes: [{ id: 'hook', number: 1, duration: 4, goal: 'goal', visual: 'visual', text: 'text', motion: 'motion' }],
      },
      check: {
        status: 'running',
        lint: { passed: true, errors: [], warnings: [] },
        updatedAt: 10,
      },
      render: { status: 'idle' },
    });

    expect(dto.status).toBe('checking');
    expect(dto.scenesCompleted).toBe(1);
    expect(dto.totalScenes).toBe(1);
    expect(dto.check?.status).toBe('running');
    expect(dto.check?.lint?.passed).toBe(true);
    expect(dto.render?.status).toBe('idle');
  });
});
