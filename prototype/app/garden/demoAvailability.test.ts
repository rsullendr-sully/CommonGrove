import { describe, expect, it } from 'vitest';
import { GardenCommunity, demoAvailability } from './CommunityCoordinator';
import { createProjectRuntime } from './projectScheduler';
import { createProjectsProgress } from './projectProgress';
import { gardenSessionReducer, createGardenSession } from './gardenSession';
import { projectWaiting } from './LearningDemoPanel';

describe('demo availability boundary', () => {
  it('copies actual tool reservations even before a tool attaches and clears them on pause', () => {
    const community = new GardenCommunity();
    community.projectRuntime = createProjectRuntime(17, 1);
    community.projectRuntime.toolClaims.mallet = { actor: 'moss', key: 'reserved' };
    community.snapshots = [{ id: 'pip', available: false, position: { x: 0, z: 0 } }];
    const snapshot = demoAvailability(community);
    expect(snapshot).toEqual({ unavailable: ['pip'], tools: { mallet: 'moss' } });
    community.projectRuntime.toolClaims.mallet.actor = 'fern';
    expect(snapshot.tools.mallet).toBe('moss');
    community.advance({ now: 0, delta: .05, paused: true, actors: [], toyFree: false }, null,
      { epoch: 1, progress: createProjectsProgress(), playerPosition: { x: 0, z: 17 } });
    expect(demoAvailability(community)).toEqual({ unavailable: [], tools: {} });
    expect(demoAvailability(new GardenCommunity())).toEqual({ unavailable: [], tools: {} });
  });
  it('explains real unavailable qualified residents and the current mallet owner', () => {
    const session = gardenSessionReducer(createGardenSession(), { type: 'start-demo', scenario: { id: 'rack-preview', residents: 1 } });
    expect(projectWaiting(session, 'tool-rack', {}, false, { unavailable: ['pip'], tools: {} })).toContain('Qualified residents are occupied');
    session.demo!.progress.projects['tool-rack'].completedSteps = 1;
    expect(projectWaiting(session, 'tool-rack', {}, false, { unavailable: [], tools: { mallet: 'moss' } })).toContain('reserved by Moss');
  });
});
