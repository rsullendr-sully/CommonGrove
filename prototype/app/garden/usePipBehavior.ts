'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activityDefinitions,
  chooseNextActivity,
  type PipActivity,
  type PipActivityKind,
} from './behavior';
import {
  hasActivityTimedOut,
  PIP_ACTIVITY_TIMEOUT_SECONDS,
  type GardenInterest,
  type GardenPoint,
} from './navigation';

export type PipPoseKind = 'idle' | 'walk' | 'inspect' | 'rest' | 'greet';

export type PipPriorityMission = {
  id: string;
  target: GardenPoint;
  startMessage: string;
  completionMessage: string;
};

export type PipBehaviorPhase = 'waiting' | 'traveling' | 'performing';

export type PipBehaviorState = {
  activity: PipActivity | null;
  target: GardenPoint | null;
  message: string | null;
  poseKind: PipPoseKind;
  phase: PipBehaviorPhase;
  mode: 'ordinary' | 'priority';
  startedAt: number;
  recentKind: PipActivityKind | null;
  cooldownUntil: Partial<Record<PipActivityKind, number>>;
  employeeNearby: boolean;
  hasGreeted: boolean;
  resumeExcludingKind: PipActivityKind | null;
  activeMission: PipPriorityMission | null;
  pendingMissions: readonly PipPriorityMission[];
  seenMissionIds: readonly string[];
};

export type PipBehaviorFrameInput = {
  now: number;
  interests: readonly GardenInterest[];
  employeeDistance: number;
  locomotionComplete: boolean;
  rewardMission: PipPriorityMission | null;
  choiceMission: PipPriorityMission | null;
  randomValue: number;
};

const GREETING_DISTANCE = 3.15;
const GREETING_EXIT_DISTANCE = 4.1;
const PRIORITY_PAUSE_SECONDS = 6;

const poseForActivity = (kind: PipActivityKind): PipPoseKind => {
  if (kind === 'rest' || kind === 'visit-pavilion') return 'rest';
  if (kind === 'greet') return 'greet';
  if (kind === 'inspect-flowers' || kind === 'watch-pond' || kind === 'inspect-destination' || kind === 'look-around') return 'inspect';
  return 'idle';
};

const greetingMessage = (hasGreeted: boolean) => hasGreeted
  ? 'Pip pauses, perks up one ear, and listens.'
  : 'Oh! You’re here. I saved the quiet spot by the spring for you.';

export function createPipBehaviorState(
  overrides: Partial<PipBehaviorState> = {},
): PipBehaviorState {
  return {
    activity: null,
    target: null,
    message: null,
    poseKind: 'idle',
    phase: 'waiting',
    mode: 'ordinary',
    startedAt: 0,
    recentKind: null,
    cooldownUntil: {},
    employeeNearby: false,
    hasGreeted: false,
    resumeExcludingKind: null,
    activeMission: null,
    pendingMissions: [],
    seenMissionIds: [],
    ...overrides,
  };
}

function interestForActivity(
  activity: PipActivity,
  interests: readonly GardenInterest[],
  randomValue: number,
) {
  if (activity.kind === 'wander') {
    const wanderInterests = interests.filter(({ id }) => id.startsWith('wander-'));
    if (wanderInterests.length === 0) return null;
    const index = Math.min(wanderInterests.length - 1, Math.floor(Math.max(0, randomValue) * wanderInterests.length));
    return wanderInterests[index];
  }
  if (activity.kind === 'inspect-destination') {
    return interests.find(({ id }) => id === 'destination')
      ?? interests.find(({ id }) => id === 'seed')
      ?? null;
  }
  if (!activity.interestId) return null;
  return interests.find(({ id }) => id === activity.interestId) ?? null;
}

function availableInterestIds(interests: readonly GardenInterest[]) {
  const ids = interests.map(({ id }) => id);
  if (ids.includes('seed') && !ids.includes('destination')) ids.push('destination');
  return ids;
}

function selectOrdinaryActivity(
  state: PipBehaviorState,
  input: PipBehaviorFrameInput,
  recentKind: PipActivityKind | null = state.recentKind,
): PipBehaviorState {
  const activity = chooseNextActivity({
    now: input.now,
    recentKind,
    employeeNearby: false,
    availableInterestIds: availableInterestIds(input.interests),
    cooldownUntil: state.cooldownUntil,
  }, input.randomValue);

  if (!activity) {
    if (
      state.mode === 'ordinary'
      && state.phase === 'waiting'
      && state.activity === null
      && state.target === null
      && state.message === null
      && state.recentKind === recentKind
    ) return state;
    return {
      ...state,
      activity: null,
      target: null,
      message: null,
      poseKind: 'idle',
      phase: 'waiting',
      mode: 'ordinary',
      startedAt: input.now,
      recentKind,
      resumeExcludingKind: null,
      activeMission: null,
    };
  }

  const interest = interestForActivity(activity, input.interests, input.randomValue);
  const isTraveling = interest !== null;
  return {
    ...state,
    activity,
    target: interest?.position ?? null,
    message: activity.kind === 'greet' ? greetingMessage(state.hasGreeted) : null,
    poseKind: isTraveling ? 'walk' : poseForActivity(activity.kind),
    phase: isTraveling ? 'traveling' : 'performing',
    mode: 'ordinary',
    startedAt: input.now,
    recentKind,
    cooldownUntil: {
      ...state.cooldownUntil,
      [activity.kind]: input.now + activity.cooldownSeconds,
    },
    hasGreeted: state.hasGreeted || activity.kind === 'greet',
    resumeExcludingKind: null,
    activeMission: null,
  };
}

function selectGreeting(state: PipBehaviorState, input: PipBehaviorFrameInput) {
  if ((state.cooldownUntil.greet ?? 0) > input.now) return state;
  const greeting = chooseNextActivity({
    now: input.now,
    recentKind: state.recentKind,
    employeeNearby: true,
    availableInterestIds: availableInterestIds(input.interests),
    cooldownUntil: state.cooldownUntil,
  }, input.randomValue);
  if (!greeting) return state;
  return {
    ...state,
    activity: greeting,
    target: null,
    message: greetingMessage(state.hasGreeted),
    poseKind: 'greet' as const,
    phase: 'performing' as const,
    startedAt: input.now,
    cooldownUntil: {
      ...state.cooldownUntil,
      greet: input.now + greeting.cooldownSeconds,
    },
    hasGreeted: true,
  };
}

function startPriorityMission(
  state: PipBehaviorState,
  mission: PipPriorityMission,
  now: number,
): PipBehaviorState {
  const priorityDefinition = activityDefinitions.find(({ kind }) => kind === 'inspect-destination')!;
  const resumeExcludingKind = state.mode === 'ordinary'
    ? state.activity?.kind ?? state.recentKind
    : state.resumeExcludingKind;
  return {
    ...state,
    activity: { ...priorityDefinition, durationSeconds: PRIORITY_PAUSE_SECONDS },
    target: mission.target,
    message: mission.startMessage,
    poseKind: 'walk',
    phase: 'traveling',
    mode: 'priority',
    startedAt: now,
    resumeExcludingKind: resumeExcludingKind ?? null,
    activeMission: mission,
    seenMissionIds: state.seenMissionIds.includes(mission.id)
      ? state.seenMissionIds
      : [...state.seenMissionIds, mission.id],
  };
}

export function interruptPipBehaviorWithReward(
  state: PipBehaviorState,
  mission: PipPriorityMission,
  now: number,
): PipBehaviorState {
  if (state.seenMissionIds.includes(mission.id)) return state;
  if (state.mode === 'priority') {
    return {
      ...state,
      pendingMissions: [...state.pendingMissions, mission],
      seenMissionIds: [...state.seenMissionIds, mission.id],
    };
  }
  return startPriorityMission(state, mission, now);
}

function completedActivityKind(state: PipBehaviorState) {
  return state.mode === 'priority'
    ? state.resumeExcludingKind
    : state.activity?.kind ?? state.recentKind;
}

export function completePipBehaviorActivity(
  state: PipBehaviorState,
  input: PipBehaviorFrameInput,
) {
  if (state.mode === 'priority' && state.pendingMissions.length > 0) {
    const [nextMission, ...remainingMissions] = state.pendingMissions;
    return startPriorityMission({ ...state, pendingMissions: remainingMissions }, nextMission, input.now);
  }
  return selectOrdinaryActivity(state, input, completedActivityKind(state));
}

export function advancePipBehavior(
  state: PipBehaviorState,
  input: PipBehaviorFrameInput,
): PipBehaviorState {
  let current = state;
  for (const mission of [input.rewardMission, input.choiceMission]) {
    if (mission) current = interruptPipBehaviorWithReward(current, mission, input.now);
  }

  let employeeNearby = current.employeeNearby;
  if (current.mode === 'ordinary') {
    const wasEmployeeNearby = current.employeeNearby;
    employeeNearby = wasEmployeeNearby
      ? input.employeeDistance <= GREETING_EXIT_DISTANCE
      : input.employeeDistance < GREETING_DISTANCE;
    if (employeeNearby !== current.employeeNearby) current = { ...current, employeeNearby };
    if (!wasEmployeeNearby && employeeNearby) current = selectGreeting(current, input);
  }

  if (!current.activity) return selectOrdinaryActivity(current, input);

  if (current.mode === 'ordinary' && current.activity.kind === 'greet' && !employeeNearby) {
    return completePipBehaviorActivity(current, input);
  }

  if (current.phase === 'traveling') {
    if (input.locomotionComplete) {
      return {
        ...current,
        target: null,
        message: current.mode === 'priority'
          ? current.activeMission?.completionMessage ?? current.message
          : current.message,
        poseKind: poseForActivity(current.activity.kind),
        phase: 'performing',
        startedAt: input.now,
      };
    }
    if (current.mode === 'ordinary' && hasActivityTimedOut(current.startedAt, input.now, PIP_ACTIVITY_TIMEOUT_SECONDS)) {
      return completePipBehaviorActivity(current, input);
    }
    return current;
  }

  if (current.phase === 'performing' && input.now - current.startedAt >= current.activity.durationSeconds) {
    return completePipBehaviorActivity(current, input);
  }

  return current;
}

export type UsePipBehaviorResult = Pick<
  PipBehaviorState,
  'activity' | 'target' | 'message' | 'poseKind' | 'mode'
> & {
  advance: (input: Omit<PipBehaviorFrameInput, 'interests' | 'randomValue'>) => PipBehaviorState;
  completeActivity: (input: Omit<PipBehaviorFrameInput, 'interests' | 'randomValue'>) => PipBehaviorState;
  interruptWithReward: (mission: PipPriorityMission, now: number) => PipBehaviorState;
};

export function usePipBehavior(
  interests: readonly GardenInterest[],
  random: () => number = Math.random,
): UsePipBehaviorResult {
  const interestsRef = useRef(interests);
  const randomRef = useRef(random);
  const [snapshot, setSnapshot] = useState<PipBehaviorState>(() => createPipBehaviorState());
  const stateRef = useRef(snapshot);

  useEffect(() => {
    interestsRef.current = interests;
    randomRef.current = random;
  }, [interests, random]);

  const commit = useCallback((next: PipBehaviorState) => {
    if (next !== stateRef.current) {
      stateRef.current = next;
      setSnapshot(next);
    }
    return next;
  }, []);

  const withLocalInputs = useCallback((input: Omit<PipBehaviorFrameInput, 'interests' | 'randomValue'>) => ({
    ...input,
    interests: interestsRef.current,
    randomValue: randomRef.current(),
  }), []);

  const advance = useCallback((input: Omit<PipBehaviorFrameInput, 'interests' | 'randomValue'>) => (
    commit(advancePipBehavior(stateRef.current, withLocalInputs(input)))
  ), [commit, withLocalInputs]);

  const completeActivity = useCallback((input: Omit<PipBehaviorFrameInput, 'interests' | 'randomValue'>) => (
    commit(completePipBehaviorActivity(stateRef.current, withLocalInputs(input)))
  ), [commit, withLocalInputs]);

  const interruptWithReward = useCallback((mission: PipPriorityMission, now: number) => (
    commit(interruptPipBehaviorWithReward(stateRef.current, mission, now))
  ), [commit]);

  return {
    activity: snapshot.activity,
    target: snapshot.target,
    message: snapshot.message,
    poseKind: snapshot.poseKind,
    mode: snapshot.mode,
    advance,
    completeActivity,
    interruptWithReward,
  };
}
