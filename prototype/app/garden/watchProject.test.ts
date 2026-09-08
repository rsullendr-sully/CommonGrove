import { describe, expect, it } from 'vitest';
import { consumeProjectWatch, projectWatchDestination } from './watchProject';

describe('watch project', () => {
  it('names the real work point and its garden direction', () => {
    expect(projectWatchDestination('tool-rack')).toMatchObject({ name: 'Tool rack', direction: 'west garden', point: { x: -14.75, z: 1.5 } });
    expect(projectWatchDestination('planter').point).toMatchObject({ x: -13.65, z: -1.8 });
  });
  it('defers a busy request and consumes it once with only look angles', () => {
    const request = { project: 'tool-rack' as const, sequence: 3 };
    const camera = { x: 0, y: 1.7, z: 17 };
    expect(consumeProjectWatch(request, null, true, camera, 0)).toBeNull();
    const result = consumeProjectWatch(request, null, false, camera, 0);
    expect(result?.sequence).toBe(3);
    expect(result?.yaw).toBeCloseTo(.76061, 5);
    expect(result?.pitch).toBeLessThan(0);
    expect(Object.keys(result!).sort()).toEqual(['pitch', 'sequence', 'yaw']);
    expect(camera).toEqual({ x: 0, y: 1.7, z: 17 });
    expect(consumeProjectWatch(request, 3, false, camera, 1)).toBeNull();
    expect(consumeProjectWatch(null, 3, false, camera, 1)).toBeNull();
  });
});
