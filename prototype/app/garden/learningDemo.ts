import { createProjectsProgress, projectComplete, reduceProjectProgress, type ProjectsProgress } from './projectProgress';
import type { ProjectId } from './projectDefinitions';
import { RESIDENTS } from './residents';
import { learnAbility } from './spiritKnowledge';
export type DemoScenarioId = 'planter-materials-first' | 'planter-knowledge-first' | 'rack-from-scratch' | 'rack-preview' | 'planter-to-rack';
export type DemoScenario = { id: DemoScenarioId; residents: 1 | 3 };
export type DemoSession = { scenario: DemoScenario; progress: ProjectsProgress };
export function createDemoProgress(scenario: DemoScenario): ProjectsProgress {
  let progress = createProjectsProgress();
  const id = `demo:${scenario.id}`;
  if (scenario.id !== 'planter-materials-first' && scenario.id !== 'rack-preview') {
    progress = reduceProjectProgress(progress, { type: 'book', id: `${id}:book` });
  }
  if (scenario.id === 'planter-materials-first' || scenario.id === 'planter-to-rack') {
    progress = reduceProjectProgress(progress, { type: 'materials', id: `${id}:planter`, project: 'planter' });
  }
  if (scenario.id === 'rack-preview') {
    progress = reduceProjectProgress(progress, { type: 'materials', id: `${id}:rack`, project: 'tool-rack' });
    for (const resident of RESIDENTS.slice(0, scenario.residents)) for (const ability of ['B1', 'B2'] as const) {
      progress = { ...progress, knowledge: learnAbility(progress.knowledge, resident.id, ability, { kind: 'preview', id: `${id}:${resident.id}:${ability}` }) };
    }
  }
  return progress;
}
export function demoBookAvailable(demo: DemoSession): boolean {
  return demo.scenario.id === 'planter-materials-first' && !demo.progress.book;
}
export function demoMaterialsAvailable(demo: DemoSession, project: ProjectId): boolean {
  if (demo.progress.projects[project].supplies !== 'absent') return false;
  if (demo.scenario.id === 'planter-knowledge-first') return project === 'planter'
    && RESIDENTS.slice(0, demo.scenario.residents).some(r => Object.keys(demo.progress.knowledge[r.id]).length > 0);
  if (demo.scenario.id === 'rack-from-scratch') return project === 'tool-rack';
  return demo.scenario.id === 'planter-to-rack' && project === 'tool-rack' && projectComplete(demo.progress, 'planter');
}
export function demoProjects(scenario: DemoScenario): readonly ProjectId[] {
  return scenario.id === 'planter-to-rack' ? ['planter', 'tool-rack']
    : scenario.id.startsWith('rack-') ? ['tool-rack'] : ['planter'];
}
