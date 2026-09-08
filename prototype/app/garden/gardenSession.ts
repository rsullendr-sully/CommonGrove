import { createJourney, journeyReducer, type JourneyEvent, type JourneyState } from './journey';
import {
  createProjectsProgress,
  reduceProjectProgress,
  type ProjectEvent,
  type ProjectsProgress,
} from './projectProgress';
import { RESIDENTS, residentsForVisit, type ResidentId } from './residents';
import { createDemoProgress, demoBookAvailable, demoMaterialsAvailable, type DemoSession, type DemoScenario } from './learningDemo';
import type { ProjectId } from './projectDefinitions';
import type { GardenView } from './rewardState';

export type GardenSession = {
  journey: JourneyState;
  project: ProjectsProgress;
  previousProject: ProjectsProgress;
  view: GardenView;
  epoch: number;
  demo: DemoSession | null;
};

export type GardenSessionEvent =
  | { type: 'journey'; event: JourneyEvent }
  | { type: 'view'; view: GardenView }
  | { type: 'materials'; id: string }
  | { type: 'project'; epoch: number; events: ProjectEvent[] }
  | { type: 'remount' }
  | { type: 'start-demo'; scenario: DemoScenario }
  | { type: 'exit-demo' }
  | { type: 'demo-book'; id: string }
  | { type: 'demo-materials'; id: string; project: ProjectId };

const BOOK_EVENT_ID = 'garden:reading-nook-book';

export function createGardenSession(): GardenSession {
  const project = createProjectsProgress();
  return {
    journey: createJourney(),
    project,
    previousProject: project,
    view: 'before',
    epoch: 0,
    demo: null,
  };
}

function isComparing(session: Pick<GardenSession, 'journey' | 'view' | 'demo'>): boolean {
  return !session.demo && session.view === 'before' && session.journey.rewardStage > 0;
}

function residentForEvent(event: ProjectEvent): ResidentId | null {
  return event.type === 'learn' || event.type === 'commit' || event.type === 'complete'
    ? event.resident
    : null;
}

function reduceAcceptedProjectEvents(session: GardenSession, events: readonly ProjectEvent[]): GardenSession {
  const present = new Set(sessionResidents(session).map(resident => resident.id));
  const active = session.demo?.progress ?? session.project;
  const project = events.reduce((progress, event) => {
    const resident = residentForEvent(event);
    return resident !== null && !present.has(resident)
      ? progress
      : reduceProjectProgress(progress, event);
  }, active);
  return project === active ? session : session.demo
    ? { ...session, demo: { ...session.demo, progress: project } } : { ...session, project };
}

export function gardenSessionReducer(session: GardenSession, event: GardenSessionEvent): GardenSession {
  if (event.type === 'start-demo') return { ...session, demo: { scenario: { ...event.scenario }, progress: createDemoProgress(event.scenario) }, epoch: session.epoch + 1 };
  if (event.type === 'exit-demo') return session.demo ? { ...createGardenSession(), epoch: session.epoch + 1 } : session;
  if (event.type === 'demo-book') return session.demo && demoBookAvailable(session.demo)
    ? reduceAcceptedProjectEvents(session, [{ type: 'book', id: event.id }]) : session;
  if (event.type === 'demo-materials') return session.demo && demoMaterialsAvailable(session.demo, event.project)
    ? reduceAcceptedProjectEvents(session, [{ type: 'materials', id: event.id, project: event.project }]) : session;
  if (session.demo && (event.type === 'journey' || event.type === 'view' || event.type === 'materials')) return session;
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
    return reduceAcceptedProjectEvents(session, [{ type: 'materials', id: event.id, project: 'planter' }]);
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
    project = reduceProjectProgress(project, { type: 'book', id: BOOK_EVENT_ID });
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

export function sessionResidents(session: GardenSession) {
  return session.demo ? RESIDENTS.slice(0, session.demo.scenario.residents) : residentsForVisit(session.journey.visit);
}

export function visibleProjects(session: GardenSession): ProjectsProgress {
  if (session.demo) return session.demo.progress;
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
