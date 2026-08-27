import { describe, expect, it } from 'vitest';
import type { GardenInterest } from './navigation';
import {
  advancePipBehavior,
  createPipBehaviorState,
  interruptPipBehaviorWithReward,
  type PipPriorityMission,
} from './usePipBehavior';

const interests: readonly GardenInterest[] = [
  { id: 'flowers', position: { x: 8.8, z: -5.9 } },
  { id: 'pond', position: { x: 8.2, z: 6.6 } },
  { id: 'pavilion', position: { x: -8.65, z: -8.1 } },
  { id: 'seed', position: { x: -8.5, z: 7.4 } },
  { id: 'wander-east', position: { x: 8.4, z: 1.5 } },
];

const ordinaryInput = {
  interests,
  employeeDistance: Number.POSITIVE_INFINITY,
  locomotionComplete: false,
  rewardMission: null,
  choiceMission: null,
};

const rewardMission: PipPriorityMission = {
  id: 'reward-1',
  target: { x: 8.2, z: 6.6 },
  startMessage: 'One ear lifts. Pip noticed something change near the pond.',
  completionMessage: 'It bloomed! Something kind reached the garden.',
};

describe('Pip behavior lifecycle', () => {
  it('starts a stationary activity, records its cooldown, and completes it after its duration', () => {
    const started = advancePipBehavior(createPipBehaviorState(), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0.24,
    });

    expect(started.activity?.kind).toBe('look-around');
    expect(started.phase).toBe('performing');
    expect(started.cooldownUntil['look-around']).toBe(4);

    const completed = advancePipBehavior(started, {
      ...ordinaryInput,
      now: 4,
      randomValue: 0,
    });

    expect(completed.activity?.kind).not.toBe('look-around');
    expect(completed.recentKind).toBe('look-around');
  });

  it('starts an interest activity on foot and performs its inspection pose after arrival', () => {
    const traveling = advancePipBehavior(createPipBehaviorState(), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0.4,
    });

    expect(traveling.activity?.kind).toBe('inspect-flowers');
    expect(traveling.target).toEqual({ x: 8.8, z: -5.9 });
    expect(traveling.phase).toBe('traveling');
    expect(traveling.poseKind).toBe('walk');

    const arrived = advancePipBehavior(traveling, {
      ...ordinaryInput,
      now: 2,
      randomValue: 0.4,
      locomotionComplete: true,
    });

    expect(arrived.phase).toBe('performing');
    expect(arrived.poseKind).toBe('inspect');
    expect(arrived.startedAt).toBe(2);
  });

  it('abandons travel just after the eight-second reachability timeout and reselects', () => {
    const traveling = advancePipBehavior(createPipBehaviorState(), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0.4,
    });
    const stillTraveling = advancePipBehavior(traveling, {
      ...ordinaryInput,
      now: 8,
      randomValue: 0,
    });
    const recovered = advancePipBehavior(stillTraveling, {
      ...ordinaryInput,
      now: 8.001,
      randomValue: 0,
    });

    expect(stillTraveling.activity?.kind).toBe('inspect-flowers');
    expect(recovered.activity?.kind).not.toBe('inspect-flowers');
    expect(recovered.recentKind).toBe('inspect-flowers');
  });

  it('does not allow an employee greeting to interrupt a reward mission', () => {
    const ordinary = advancePipBehavior(createPipBehaviorState(), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0,
    });
    const interrupted = interruptPipBehaviorWithReward(ordinary, rewardMission, 1);
    const employeeArrives = advancePipBehavior(interrupted, {
      ...ordinaryInput,
      now: 2,
      randomValue: 0,
      employeeDistance: 2,
    });

    expect(employeeArrives.mode).toBe('priority');
    expect(employeeArrives.message).toBe(rewardMission.startMessage);
    expect(employeeArrives.activity?.kind).toBe('inspect-destination');
  });

  it('returns to a fresh ordinary activity after the reward pause', () => {
    const ordinary = advancePipBehavior(createPipBehaviorState(), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0,
    });
    const interrupted = interruptPipBehaviorWithReward(ordinary, rewardMission, 1);
    const arrived = advancePipBehavior(interrupted, {
      ...ordinaryInput,
      now: 2,
      randomValue: 0,
      locomotionComplete: true,
    });
    const resumed = advancePipBehavior(arrived, {
      ...ordinaryInput,
      now: 8,
      randomValue: 0,
    });

    expect(arrived.message).toBe(rewardMission.completionMessage);
    expect(resumed.mode).toBe('ordinary');
    expect(resumed.activity?.kind).not.toBe(ordinary.activity?.kind);
  });

  it('waits and retries when every ordinary activity is cooling down', () => {
    const cooldownUntil = {
      wander: 10,
      'look-around': 10,
      'inspect-flowers': 10,
      'watch-pond': 10,
      'visit-pavilion': 10,
      'inspect-destination': 10,
      rest: 10,
    } as const;
    const waiting = advancePipBehavior(createPipBehaviorState({ cooldownUntil }), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0,
    });
    const retried = advancePipBehavior(waiting, {
      ...ordinaryInput,
      now: 10,
      randomValue: 0,
    });

    expect(waiting.activity).toBeNull();
    expect(waiting.phase).toBe('waiting');
    expect(waiting.poseKind).toBe('idle');
    expect(retried.activity).not.toBeNull();
  });

  it('greets only on the employee proximity edge during ordinary behavior', () => {
    const ordinary = advancePipBehavior(createPipBehaviorState(), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0,
    });
    const greeted = advancePipBehavior(ordinary, {
      ...ordinaryInput,
      now: 1,
      randomValue: 0,
      employeeDistance: 2,
    });
    const stillGreeting = advancePipBehavior(greeted, {
      ...ordinaryInput,
      now: 5,
      randomValue: 0,
      employeeDistance: 2,
    });

    expect(greeted.activity?.kind).toBe('greet');
    expect(greeted.message).toBe('Oh! You’re here. I saved the quiet spot by the spring for you.');
    expect(stillGreeting.activity?.kind).not.toBe('greet');
  });

  it('honors the greeting cooldown when the employee leaves and returns', () => {
    const ordinary = advancePipBehavior(createPipBehaviorState(), {
      ...ordinaryInput,
      now: 0,
      randomValue: 0,
    });
    const greeted = advancePipBehavior(ordinary, {
      ...ordinaryInput,
      now: 1,
      randomValue: 0,
      employeeDistance: 2,
    });
    const finishedGreeting = advancePipBehavior(greeted, {
      ...ordinaryInput,
      now: 5,
      randomValue: 0,
      employeeDistance: 2,
    });
    const employeeLeaves = advancePipBehavior(finishedGreeting, {
      ...ordinaryInput,
      now: 6,
      randomValue: 0,
      employeeDistance: 5,
    });
    const employeeReturns = advancePipBehavior(employeeLeaves, {
      ...ordinaryInput,
      now: 7,
      randomValue: 0,
      employeeDistance: 2,
    });

    expect(employeeReturns.activity?.kind).not.toBe('greet');
  });
});
