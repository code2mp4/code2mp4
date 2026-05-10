import { describe, expect, it } from 'vitest';
import { projectDto } from '../src/server.js';
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
