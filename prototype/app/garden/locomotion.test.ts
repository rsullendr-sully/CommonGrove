import { describe, expect, it } from 'vitest';
import { EMPLOYEE_WALK_SPEED } from './locomotion';

describe('locomotion constants', () => {
  it('sets employee travel to four meters per second', () => {
    expect(EMPLOYEE_WALK_SPEED).toBe(4);
  });
});
