export type PipActivityKind =
  | 'wander'
  | 'look-around'
  | 'inspect-flowers'
  | 'watch-pond'
  | 'visit-pavilion'
  | 'inspect-destination'
  | 'rest'
  | 'greet';

export type PipActivity = {
  kind: PipActivityKind;
  weight: number;
  durationSeconds: number;
  cooldownSeconds: number;
  interestId?: string;
};

export type BehaviorContext = {
  now: number;
  recentKind: PipActivityKind | null;
  employeeNearby: boolean;
  availableInterestIds: readonly string[];
  cooldownUntil: Partial<Record<PipActivityKind, number>>;
};

export const activityDefinitions: readonly PipActivity[] = [
  { kind: 'wander', weight: 3, durationSeconds: 8, cooldownSeconds: 3 },
  { kind: 'look-around', weight: 2, durationSeconds: 4, cooldownSeconds: 4 },
  { kind: 'inspect-flowers', weight: 2, durationSeconds: 6, cooldownSeconds: 8, interestId: 'flowers' },
  { kind: 'watch-pond', weight: 2, durationSeconds: 7, cooldownSeconds: 10, interestId: 'pond' },
  { kind: 'visit-pavilion', weight: 2, durationSeconds: 8, cooldownSeconds: 12, interestId: 'pavilion' },
  { kind: 'inspect-destination', weight: 1, durationSeconds: 6, cooldownSeconds: 10, interestId: 'destination' },
  { kind: 'rest', weight: 1, durationSeconds: 5, cooldownSeconds: 8 },
  { kind: 'greet', weight: 1, durationSeconds: 4, cooldownSeconds: 10 },
];

function isAvailable(definition: PipActivity, context: BehaviorContext, excludeRecent: boolean) {
  if (definition.interestId && !context.availableInterestIds.includes(definition.interestId)) return false;
  if (context.cooldownUntil[definition.kind] !== undefined && context.cooldownUntil[definition.kind]! > context.now) return false;
  return !excludeRecent || definition.kind !== context.recentKind;
}

function normalizedRandomValue(randomValue: number) {
  if (!Number.isFinite(randomValue)) return randomValue === Number.POSITIVE_INFINITY ? 1 - Number.EPSILON : 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, randomValue));
}

export function chooseNextActivity(context: BehaviorContext, randomValue: number): PipActivity | null {
  if (context.employeeNearby) return activityDefinitions.find(({ kind }) => kind === 'greet')!;

  const ordinaryDefinitions = activityDefinitions.filter(({ kind }) => kind !== 'greet');
  const notCooled = ordinaryDefinitions.filter((definition) => isAvailable(definition, context, false));
  if (notCooled.length === 0) return null;
  const eligible = notCooled.filter((definition) => isAvailable(definition, context, true));
  const pool = eligible.length > 0 ? eligible : notCooled;

  const totalWeight = pool.reduce((sum, definition) => sum + definition.weight, 0);
  const target = normalizedRandomValue(randomValue) * totalWeight;
  let cumulative = 0;
  for (const definition of pool) {
    cumulative += definition.weight;
    if (target < cumulative) return definition;
  }
  return pool[pool.length - 1];
}
