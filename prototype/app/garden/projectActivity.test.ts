import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { projectMotion, projectVisual, stepProjectTravel, type ProjectTravel } from './projectActivity';
import type { ProjectDirective } from './projectScheduler';
import { GARDEN_OBSTACLES } from './navigation';

const directive: ProjectDirective = { key: 'work:1', actor: 'pip', action: 'tap', tool: 'mallet', elapsed: .25,
  project: 'planter', step: 1, ability: 'B2', phase: 'perform', target: { x: 2, z: 12 }, lookAt: { x: 3, z: 12 } };
describe('project acting', () => {
  it('approaching never animates fastening', () => {
    const motion = projectMotion({ action: 'tap', tool: 'mallet', elapsed: 1,
      performing: false, reducedMotion: false });
    expect(motion.tap).toBe(0);
  });
  it('uses a settling rotation for fitting and a separate strike for tapping', () => {
    const fit = projectMotion({ action: 'fit', tool: 'piece', elapsed: .25,
      performing: true, reducedMotion: false });
    const tap = projectMotion({ action: 'tap', tool: 'mallet', elapsed: .25,
      performing: true, reducedMotion: false });
    expect(fit.fitRotation).toBeGreaterThan(0);
    expect(fit.settle).toBeGreaterThan(0);
    expect(fit.tap).toBe(0);
    expect(tap.tap).toBeGreaterThan(0);
    expect(tap.fitRotation).toBe(0);
  });
  it('keeps reduced-motion tool use readable without rhythmic taps', () => {
    const a = projectMotion(projectVisual(directive, true));
    expect(a.tap).toBe(0);
    expect(a.lean).toBeGreaterThan(0);
    expect(a.contact).toBe(true);
    expect(projectMotion(projectVisual({ ...directive, elapsed: 100 }, true))).toEqual(a);
  });
  it('keeps carrying gait free of the stationary work pose', () => {
    expect(projectMotion(projectVisual({ ...directive, phase: 'approach' }, false))).toMatchObject({ lean: 0, tap: 0, tilt: 0, contact: false });
    expect(projectMotion(projectVisual(directive, false)).tap).toBeGreaterThan(0);
    expect(projectMotion(projectVisual({ ...directive, action: 'water', tool: 'can' }, true)).tilt).toBeGreaterThan(0);
  });
  it('walks a carried piece by travelled distance and only performs after arrival', () => {
    const d = { ...directive, action: 'carry' as const, tool: 'piece' as const, phase: 'approach' as const };
    let travel: ProjectTravel = { motion: { position: new THREE.Vector3(-2, 0, 12), facing: 0, speed: 0, distanceTravelled: 0, moving: false },
      key: null, waypoints: [], waypointIndex: 0, planned: false };
    for (let i = 0; i < 160; i++) travel = stepProjectTravel(travel, d, .05, GARDEN_OBSTACLES);
    expect(travel.motion.distanceTravelled).toBeGreaterThan(3.7);
    expect(travel.motion.position.x).toBeCloseTo(2, 1);
  });
  it('reports no arrival or walking for an unreachable target', () => {
    const travel = stepProjectTravel({ motion: { position: new THREE.Vector3(-2, 0, 12), facing: 0, speed: 0, distanceTravelled: 0, moving: false },
      key: null, waypoints: [], waypointIndex: 0, planned: false }, { ...directive, target: { x: 0, z: 0 } }, .05, GARDEN_OBSTACLES);
    expect(travel.planned).toBe(false);
    expect(travel.arrived).toBe(false);
    expect(travel.motion.distanceTravelled).toBe(0);
  });
});
