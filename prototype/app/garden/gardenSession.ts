import { createJourney, journeyReducer, type JourneyEvent, type JourneyState } from './journey';
import {
  createPlanterProgress,
  reducePlanterProgress,
  type PlanterEvent,
  type PlanterProgress,
} from './planterProgress';
import { residentsForVisit, type ResidentId } from './residents';
import type { GardenView } from './rewardState';

export type GardenSession = {
  journey: JourneyState;
  project: PlanterProgress;
  previousProject: PlanterProgress;
  view: GardenView;
  epoch: number;
};

export type GardenSessionEvent =
  | { type: 'journey'; event: JourneyEvent }
  | { type: 'view'; view: GardenView }
  | { type: 'materials'; id: string }
  | { type: 'project'; epoch: number; events: PlanterEvent[] }
  | { type: 'remount' };

const BOOK_EVENT_ID = 'garden:reading-nook-book';

export function createGardenSession(): GardenSession {
  const project = createPlanterProgress();
  return {
    journey: createJourney(),
    project,
    previousProject: project,
    view: 'before',
    epoch: 0,
  };
}

function isComparing(session: Pick<GardenSession, 'journey' | 'view'>): boolean {
  return session.view === 'before' && session.journey.rewardStage > 0;
}

function residentForEvent(event: PlanterEvent): ResidentId | null {
  return event.type === 'learn' || event.type === 'commit' || event.type === 'build'
    ? event.resident
    : null;
}

function reduceAcceptedProjectEvents(session: GardenSession, events: readonly PlanterEvent[]): GardenSession {
  const present = new Set(residentsForVisit(session.journey.visit).map(resident => resident.id));
  const project = events.reduce((progress, event) => {
    const resident = residentForEvent(event);
    return resident !== null && !present.has(resident)
      ? progress
      : reducePlanterProgress(progress, event);
  }, session.project);
  return project === session.project ? session : { ...session, project };
}

export function gardenSessionReducer(session: GardenSession, event: GardenSessionEvent): GardenSession {
  if (event.type === 'remount') return { ...session, epoch: session.epoch + 1 };

  if (event.type === 'view') {
    if (event.view === session.view) return session;
    const next = { ...session, view: event.view };
    return isComparing(next) === isComparing(session)
      ? next
      : { ...next, epoch: session.epoch + 1 };
  }

  if (event.type === 'materials') {
    if (isComparing(session)) return session;
    return reduceAcceptedProjectEvents(session, [{ type: 'materials', id: event.id }]);
  }

  if (event.type === 'project') {
    if (event.epoch !== session.epoch || isComparing(session) || event.events.length === 0) return session;
    return reduceAcceptedProjectEvents(session, event.events);
  }

  const journey = journeyReducer(session.journey, event.event);
  if (journey === session.journey) return session;

  if (event.event.type === 'reset') {
    const reset = createGardenSession();
    return { ...reset, epoch: session.epoch + 1 };
  }

  let project = session.project;
  let previousProject = session.previousProject;
  const rewardChanged = event.event.type === 'accomplishment'
    && journey.rewardStage !== session.journey.rewardStage;
  const returned = event.event.type === 'return' && journey.visit !== session.journey.visit;

  if (rewardChanged || returned) previousProject = project;

  const crossedReadingReward = rewardChanged
    && session.journey.rewardStage < 2
    && journey.rewardStage >= 2;
  if (crossedReadingReward || event.event.type === 'preview-community') {
    project = reducePlanterProgress(project, { type: 'book', id: BOOK_EVENT_ID });
  }

  if (event.event.type === 'preview-community') {
    // The preview lands on return three; its historical return-two nook already
    // contains the book. Preserve earlier materials and progress in both views.
    previousProject = project;
  }

  const sceneChanged = event.event.type !== 'remember';
  return {
    ...session,
    journey,
    project,
    previousProject,
    epoch: sceneChanged ? session.epoch + 1 : session.epoch,
  };
}

export function visiblePlanter(session: GardenSession): PlanterProgress {
  return isComparing(session) ? session.previousProject : session.project;
}

export type GardenMountHandshake = {
  mount: () => boolean;
  unmount: () => void;
  acknowledgedEpoch: (epoch: number) => number | null;
};

export function createGardenMountHandshake(mountedEpoch: number): GardenMountHandshake {
  let active = false;
  let remountSent = false;
  return {
    mount() {
      active = true;
      if (remountSent) return false;
      remountSent = true;
      return true;
    },
    unmount() {
      active = false;
    },
    acknowledgedEpoch(epoch) {
      return active && remountSent && epoch !== mountedEpoch ? epoch : null;
    },
  };
}
