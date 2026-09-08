'use client';

import { CraftedWoodMaterial, SoftBoxGeometry } from './CraftedGeometry';
import { groundGardenPosition } from './gardenElevation';
import { PROJECT_RECIPES } from './projectDefinitions';
import type { ProjectLayout, ReusableTool } from './projectLayout';
import type { ProjectState } from './projectProgress';
import { useProjectWoodTexture } from './PlanterProject';

export type ToolRackPart = 'base' | 'base-fasteners' | 'upright' | 'upright-fasteners' | 'crossbar' | 'crossbar-fasteners';

const TOOL_RACK_REVEALS: Record<string, ToolRackPart> = {
  'tool-rack-base-seated': 'base',
  'tool-rack-base-fastened': 'base-fasteners',
  'tool-rack-upright-seated': 'upright',
  'tool-rack-upright-fastened': 'upright-fasteners',
  'tool-rack-crossbar-seated': 'crossbar',
  'tool-rack-crossbar-fastened': 'crossbar-fasteners',
};

export function toolRackParts(completedSteps: number): readonly ToolRackPart[] {
  return PROJECT_RECIPES['tool-rack'].slice(0, Math.max(0, completedSteps))
    .flatMap(step => TOOL_RACK_REVEALS[step.reveal] ? [TOOL_RACK_REVEALS[step.reveal]] : []);
}

export type RestingToolPose = {
  elevation: number;
  rotation: readonly [number, number, number];
};

/** Poses hang each tool from the matching completed-rack hook, clear of its base. */
export function toolRackStoredPose(tool: ReusableTool): RestingToolPose {
  return tool === 'mallet'
    ? { elevation: .755, rotation: [0, 0, .08] }
    : { elevation: .672, rotation: [0, Math.PI, 0] };
}

function JointPeg({ position, rotation = [Math.PI / 2, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return <mesh position={position} rotation={rotation} castShadow>
    <cylinderGeometry args={[.027, .027, .035, 10]} />
    <meshStandardMaterial color="#8c6e4d" roughness={.82} metalness={.04} />
  </mesh>;
}

export default function ToolRackProject({ state, layout }: { state: ProjectState; layout: ProjectLayout }): React.JSX.Element | null {
  const texture = useProjectWoodTexture();
  const parts = toolRackParts(state.completedSteps);
  if (parts.length === 0) return null;
  return <group name={`shared-tool-rack-step-${state.completedSteps}`}
    position={groundGardenPosition(layout.center.x, layout.center.z, .01)} rotation={[0, -.05, 0]}>
    {parts.includes('base') && <group name="tool-rack-base">
      <mesh position={[0, .065, 0]} castShadow><SoftBoxGeometry args={[1.02, .13, .48]} /><CraftedWoodMaterial map={texture} color="#b68e60" /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * .39, .115, 0]} castShadow>
        <SoftBoxGeometry args={[.16, .09, .62]} /><CraftedWoodMaterial map={texture} color="#c5aa82" />
      </mesh>)}
    </group>}
    {parts.includes('base-fasteners') && <group name="tool-rack-base-fasteners">
      {[-1, 1].flatMap(x => [-1, 1].map(z => <JointPeg key={`${x}:${z}`} position={[x * .39, .175, z * .2]} />))}
    </group>}
    {parts.includes('upright') && <group name="tool-rack-upright">
      {[-1, 1].map(side => <mesh key={side} position={[side * .38, .56, 0]} castShadow>
        <SoftBoxGeometry args={[.14, .9, .16]} /><CraftedWoodMaterial map={texture} color={side < 0 ? '#bd9d72' : '#c5aa82'} />
      </mesh>)}
    </group>}
    {parts.includes('upright-fasteners') && <group name="tool-rack-upright-fasteners">
      {[-1, 1].map(side => <JointPeg key={side} position={[side * .38, .225, .09]} rotation={[Math.PI / 2, 0, 0]} />)}
    </group>}
    {parts.includes('crossbar') && <mesh name="tool-rack-crossbar" position={[0, 1.01, 0]} castShadow>
      <SoftBoxGeometry args={[1.08, .16, .17]} /><CraftedWoodMaterial map={texture} color="#b89669" />
    </mesh>}
    {parts.includes('crossbar-fasteners') && <group name="tool-rack-crossbar-fasteners">
      {[-1, 1].map(side => <JointPeg key={side} position={[side * .38, 1.01, .095]} rotation={[Math.PI / 2, 0, 0]} />)}
      {[-.24, .24].map(x => <mesh key={x} position={[x, .89, .095]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[.045, .014, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#8c6e4d" roughness={.86} metalness={.03} />
      </mesh>)}
    </group>}
  </group>;
}
