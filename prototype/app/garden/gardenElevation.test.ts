import { describe, expect, it } from 'vitest';
import { captureGardenLocalPosition, createGardenGroundGeometry, getGardenElevation, groundGardenPosition } from './gardenElevation';
import { createPipInteractionSceneState, pipInteractionSceneReducer } from './pipInteractionScene';

describe('connected reading terrace', () => {
  it('does not accumulate elevation through repeated toy pickup, offer and recovery', () => {
    let state = createPipInteractionSceneState();
    state = { ...state, objectPositions: { ...state.objectPositions, toy: [-12.2, .2, -11.85] } };
    for (let cycle = 0; cycle < 3; cycle++) {
      const [x, offset, z] = state.objectPositions.toy;
      const [, y] = groundGardenPosition(x, z, offset);
      state = pipInteractionSceneReducer(state, { type: 'focus', target: 'toy' });
      state = pipInteractionSceneReducer(state, { type: 'activate', event: {
        type: 'pick-up', target: 'toy', safePosition: captureGardenLocalPosition({ x, y, z }, { x, z }),
      } });
      state = pipInteractionSceneReducer(state, { type: 'offer-object', target: 'toy', reactionPoint: { x: -12.2, z: -10.7 }, pipAvailable: true });
      state = pipInteractionSceneReducer(state, { type: 'toy-nudged' });
      state = pipInteractionSceneReducer(state, { type: 'object-reaction-complete' });
      expect(state.phase).toBe('none');
      expect(state.objectPositions.toy[1]).toBeCloseTo(.2);
      expect(groundGardenPosition(x, z, state.objectPositions.toy[1])[1]).toBeCloseTo(1.7);
    }
  });

  it('raises the whole reading deck but leaves the pond and entry flat', () => {
    expect(getGardenElevation(-12.2, -12.4)).toBe(1.5);
    expect(getGardenElevation(-10.2, -10.4)).toBe(1.5);
    expect(getGardenElevation(0, 17)).toBe(0);
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      expect(getGardenElevation(Math.cos(a) * 7.1, Math.sin(a) * 7.1)).toBeCloseTo(0);
    }
  });

  it('has a continuous, monotone walkable approach', () => {
    let previous = 0;
    for (let z = -3.4; z >= -9.1; z -= 0.05) {
      const height = getGardenElevation(-12.2, z);
      expect(height).toBeGreaterThanOrEqual(previous);
      expect(height - previous).toBeLessThan(0.015);
      previous = height;
    }
    expect(getGardenElevation(-12.2, -6.25)).toBeCloseTo(0.75);
    expect(getGardenElevation(-12.2, -9.1)).toBeCloseTo(1.5);
  });

  it('grounds camera and loose objects without changing their local offsets', () => {
    expect(groundGardenPosition(-12.2, -12.4, 1.7)).toEqual([-12.2, 3.2, -12.4]);
    expect(groundGardenPosition(-12.2, -12.4, 0.12)).toEqual([-12.2, 1.62, -12.4]);
    expect(groundGardenPosition(0, 17)).toEqual([0, 0, 17]);
  });

  it('builds the visible ground from exactly the same sampler', () => {
    const geometry = createGardenGroundGeometry();
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    expect(positions.count).toBeLessThan(30000);
    for (let i = 0; i < positions.count; i++) {
      expect(positions.getY(i)).toBeCloseTo(getGardenElevation(positions.getX(i), positions.getZ(i)), 5);
      expect(Number.isFinite(normals.getY(i))).toBe(true);
      expect(normals.getY(i)).toBeGreaterThan(0);
    }
    geometry.dispose();
  });
});
