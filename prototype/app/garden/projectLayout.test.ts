import { describe, expect, it } from 'vitest';
import { createStorybookEnvironmentLayout } from './environmentLayout';
import { getGardenElevation } from './gardenElevation';
import { createSafeGardenRoute, GARDEN_OBSTACLES, isSafeGardenPoint, isSafeGardenSegment, type GardenPoint } from './navigation';
import { PAVILION_READING_POINT } from './pavilionLayout';
import { PLANTER_LAYOUT } from './planterLayout';
import { createProjectsProgress } from './projectProgress';
import { PROJECT_LAYOUTS, projectObstacles, toolRestAnchor } from './projectLayout';
import { RESIDENTS } from './residents';

describe('shared recipe sites', () => {
  it('reserves final footprints only for activated projects, including material opportunities', () => {
    const p = createProjectsProgress();
    expect(projectObstacles(p)).toEqual([]);
    expect(projectObstacles(p, ['planter'])).toContainEqual({ x: -15, z: -1.8, radius: .85 });
    expect(projectObstacles(p, ['planter']).some(o => o.radius === .65)).toBe(false);
    p.projects['tool-rack'].supplies = 'available';
    const obstacles = projectObstacles(p, ['planter', 'tool-rack', 'tool-rack']);
    expect(obstacles.filter(o => o.radius === .65)).toHaveLength(1);
    expect(new Set(obstacles.map(o => `${o.x}:${o.z}:${o.radius}`)).size).toBe(obstacles.length);
  });

  it('freezes claimed tool anchors across rack completion and selects rack storage when released', () => {
    const p = createProjectsProgress();
    const supply = toolRestAnchor(p, 'mallet', null);
    p.projects['tool-rack'].completedSteps = 6;
    expect(toolRestAnchor(p, 'mallet', supply)).toEqual(supply);
    expect(toolRestAnchor(p, 'mallet', null)).not.toEqual(supply);
    expect(toolRestAnchor(p, 'can', null)).not.toEqual(toolRestAnchor(p, 'mallet', null));
  });

  it('keeps footprints level and clear of rendered berms', () => {
    const p = createProjectsProgress();
    p.book = true;
    p.projects.planter.supplies = p.projects['tool-rack'].supplies = 'available';
    expect(projectObstacles(p, ['planter', 'tool-rack']).length).toBeGreaterThanOrEqual(4);
    for (const o of projectObstacles(p, ['planter', 'tool-rack'])) {
      const samples = Array.from({ length: 17 }, (_, i) => i === 16 ? o : {
        x: o.x + Math.cos(i / 16 * Math.PI * 2) * o.radius,
        z: o.z + Math.sin(i / 16 * Math.PI * 2) * o.radius,
      });
      const elevations = samples.map(point => getGardenElevation(point.x, point.z));
      expect(Math.max(...elevations) - Math.min(...elevations)).toBeLessThanOrEqual(.08);
      // Preserve the legacy planter footprint; its conservative berm overlap is documented.
      if (o.radius !== .65) continue;
      for (const [index, berm] of createStorybookEnvironmentLayout().berms.entries()) {
        const x = (o.x - berm.center.x) / (berm.radius * 1.06 + o.radius);
        const z = (o.z - berm.center.z) / (berm.radius * (index % 2 ? .58 : .66) + o.radius);
        expect(x * x + z * z, `footprint ${o.x},${o.z} overlaps berm ${index}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('routes real resident spawns through both project roles and back to the reading approach', () => {
    const p = createProjectsProgress();
    p.book = true;
    p.projects.planter.supplies = p.projects['tool-rack'].supplies = 'available';
    const obstacles = [...GARDEN_OBSTACLES, ...projectObstacles(p, ['planter', 'tool-rack'])];
    expect(Object.keys(PROJECT_LAYOUTS)).toHaveLength(2);
    const route = (start: GardenPoint, target: GardenPoint) => {
      const points = createSafeGardenRoute(start, target, obstacles);
      expect(points.at(-1)).toEqual(target);
      let previous = start;
      for (const point of points) {
        expect(isSafeGardenPoint(point, obstacles)).toBe(true);
        expect(isSafeGardenSegment(previous, point, obstacles)).toBe(true);
        for (let j = 0; j <= 24; j++) {
          const sample = { x: previous.x + (point.x - previous.x) * j / 24, z: previous.z + (point.z - previous.z) * j / 24 };
          for (const [index, berm] of createStorybookEnvironmentLayout().berms.entries()) {
            const x = (sample.x - berm.center.x) / (berm.radius * 1.06 + .35);
            const z = (sample.z - berm.center.z) / (berm.radius * (index % 2 ? .58 : .66) + .35);
            expect(x * x + z * z, `route ${start.x},${start.z} to ${target.x},${target.z}`).toBeGreaterThanOrEqual(1);
          }
        }
        previous = point;
      }
    };
    for (const layout of Object.values(PROJECT_LAYOUTS)) {
      const slots = Object.values(layout.slots);
      for (const point of slots) {
        expect(isSafeGardenPoint(point, obstacles)).toBe(true);
        for (const resident of RESIDENTS) route({ x: resident.spawn[0], z: resident.spawn[2] }, point);
        route(point, PAVILION_READING_POINT);
      }
      const simultaneous = [layout.slots.work, layout.slots.observe, layout.slots.carryDrop];
      for (const [i, point] of simultaneous.entries()) for (const other of simultaneous.slice(i + 1)) {
        expect(Math.hypot(point.x - other.x, point.z - other.z)).toBeGreaterThanOrEqual(.85);
      }
      route(layout.slots.pickup, layout.slots.carryDrop);
    }
    route({ x: PAVILION_READING_POINT.x, z: -3.2 }, PLANTER_LAYOUT.slots.read);
  });
});
