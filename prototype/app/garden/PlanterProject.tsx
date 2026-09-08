'use client';

import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { CraftedWoodMaterial, SoftBoxGeometry } from './CraftedGeometry';
import { groundGardenPosition } from './gardenElevation';
import { GARDEN_TEXTURE_PATHS, prepareGardenTexture } from './gardenSurface';
import type { ProjectDirective } from './projectScheduler';
import { type PlanterLayout } from './planterLayout';
import type { BuildStage, PlanterProjection } from './planterProgress';
import type { GardenPoint } from './navigation';
import type { ResidentId } from './residents';

export type PlanterPart = 'base' | 'frame' | 'soil' | 'sprouts';
export type BasketItem = NonNullable<ProjectDirective['tool']>;

const PLANTER_PARTS: Record<BuildStage, readonly PlanterPart[]> = {
  empty: [],
  base: ['base'],
  frame: ['base', 'frame'],
  soil: ['base', 'frame', 'soil'],
  planted: ['base', 'frame', 'soil', 'sprouts'],
};

export function planterParts(stage: BuildStage): readonly PlanterPart[] {
  return PLANTER_PARTS[stage];
}

export function basketItems(
  progress: PlanterProjection,
  directives: Partial<Record<ResidentId, ProjectDirective>>,
): readonly BasketItem[] {
  if (progress.supplies === 'absent') return [];
  const materials: BasketItem[] = progress.supplies === 'used'
    ? []
    : progress.supplies === 'available' || progress.stage === 'empty' || progress.stage === 'base'
      ? ['piece', 'soil', 'seeds']
      : progress.stage === 'frame'
        ? ['soil', 'seeds']
        : ['seeds'];
  const claimed = new Set(Object.values(directives).flatMap(directive => directive?.tool ? [directive.tool] : []));
  const items: BasketItem[] = [...materials, 'mallet', 'can'];
  return items.filter(item => !claimed.has(item));
}

export function ProjectTool({ kind }: { kind: BasketItem }): React.JSX.Element {
  if (kind === 'piece') return <group name="planter-piece">
    <mesh castShadow><SoftBoxGeometry args={[.24, .075, .12]} /><meshStandardMaterial color="#bd9d72" roughness={.98} /></mesh>
    <mesh position={[.055, .043, .061]} scale={[.014, .014, .009]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#8c6e4d" roughness={1} /></mesh>
  </group>;
  if (kind === 'soil') return <group name="planter-soil-sack">
    <mesh scale={[.13, .16, .09]} castShadow><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color="#c9b28a" roughness={1} /></mesh>
    <mesh position={[0, .15, 0]} scale={[.065, .025, .055]} castShadow><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#8e7455" roughness={1} /></mesh>
    <mesh position={[0, .005, .087]} scale={[.052, .042, .008]}><circleGeometry args={[1, 16]} /><meshStandardMaterial color="#66513e" roughness={1} /></mesh>
  </group>;
  if (kind === 'seeds') return <group name="planter-seed-packet">
    <mesh castShadow><SoftBoxGeometry args={[.14, .18, .035]} /><meshStandardMaterial color="#e0c87f" roughness={.95} /></mesh>
    <mesh position={[0, .01, .02]} scale={[.038, .052, .008]}><sphereGeometry args={[1, 14, 9]} /><meshStandardMaterial color="#66884f" roughness={1} /></mesh>
  </group>;
  if (kind === 'mallet') return <group name="planter-mallet">
    <mesh position={[0, -.035, 0]} rotation={[0, 0, -.12]} castShadow><cylinderGeometry args={[.025, .032, .25, 10]} /><meshStandardMaterial color="#8c6748" roughness={1} /></mesh>
    <mesh position={[0, .09, 0]} castShadow><SoftBoxGeometry args={[.18, .09, .11]} /><meshStandardMaterial color="#c5aa82" roughness={.98} /></mesh>
  </group>;
  return <group name="planter-watering-can">
    <mesh scale={[.12, .13, .105]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#7faaa0" roughness={.92} /></mesh>
    <mesh position={[.13, .015, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow><cylinderGeometry args={[.027, .052, .18, 10]} /><meshStandardMaterial color="#7faaa0" roughness={.92} /></mesh>
    <mesh position={[-.01, .115, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.085, .018, 10, 20, Math.PI]} /><meshStandardMaterial color="#628d83" roughness={.96} /></mesh>
  </group>;
}

function PictureBook({ texture }: { texture: THREE.Texture }) {
  return <group name="making-and-growing-book">
    <mesh position={[0, -.1, 0]} castShadow><SoftBoxGeometry args={[.26, .2, .18]} /><CraftedWoodMaterial map={texture} color="#b5946b" /></mesh>
    <group position={[0, .06, .02]} rotation={[-.52, 0, 0]}>
      <mesh position={[-.09, 0, 0]} castShadow><SoftBoxGeometry args={[.175, .018, .24]} /><meshStandardMaterial color="#f3e5bd" roughness={.95} /></mesh>
      <mesh position={[.09, 0, 0]} castShadow><SoftBoxGeometry args={[.175, .018, .24]} /><meshStandardMaterial color="#f7eaca" roughness={.95} /></mesh>
      <mesh position={[0, .012, 0]}><SoftBoxGeometry args={[.012, .018, .235]} /><meshStandardMaterial color="#9b775a" roughness={1} /></mesh>
      <group position={[-.09, .018, 0]} name="leaf-diagram">
        <mesh position={[0, 0, .018]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.009, .009, .13, 8]} /><meshStandardMaterial color="#54764a" roughness={1} /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * .033, .003, side * .018]} rotation={[-Math.PI / 2, 0, side * -.55]} scale={[.038, .055, .01]}><sphereGeometry args={[1, 14, 9]} /><meshStandardMaterial color={side < 0 ? '#72935d' : '#4d774b'} roughness={1} /></mesh>)}
      </group>
      <group position={[.09, .019, 0]} name="assembly-diagram">
        <mesh position={[0, 0, -.047]}><SoftBoxGeometry args={[.105, .012, .026]} /><meshStandardMaterial color="#a77c55" roughness={1} /></mesh>
        <mesh position={[-.039, .004, .012]} rotation={[0, .22, 0]}><SoftBoxGeometry args={[.025, .012, .105]} /><meshStandardMaterial color="#bd986b" roughness={1} /></mesh>
        <mesh position={[.039, .004, .012]} rotation={[0, -.22, 0]}><SoftBoxGeometry args={[.025, .012, .105]} /><meshStandardMaterial color="#bd986b" roughness={1} /></mesh>
      </group>
    </group>
  </group>;
}

function SupplyBasket({ progress, directives, texture, separateTools }: { progress: PlanterProjection; directives: Partial<Record<ResidentId, ProjectDirective>>; texture: THREE.Texture; separateTools: boolean }) {
  const items = basketItems(progress, directives).filter(item => !separateTools || (item !== 'mallet' && item !== 'can'));
  const positions: Record<BasketItem, readonly [number, number, number]> = {
    piece: [-.19, .23, -.11], soil: [0, .22, .08], seeds: [.2, .23, .1],
    mallet: [.19, .2, -.12], can: [-.2, .22, .1],
  };
  return <group name="planter-supply-basket">
    <mesh position={[0, .055, 0]} castShadow><SoftBoxGeometry args={[.72, .1, .54]} /><CraftedWoodMaterial map={texture} color="#b89669" /></mesh>
    {[-1, 1].map(side => <mesh key={'long-' + side} position={[0, .16, side * .245]} castShadow><SoftBoxGeometry args={[.72, .18, .055]} /><CraftedWoodMaterial map={texture} color="#c3a375" /></mesh>)}
    {[-1, 1].map(side => <mesh key={'short-' + side} position={[side * .335, .16, 0]} castShadow><SoftBoxGeometry args={[.055, .18, .44]} /><CraftedWoodMaterial map={texture} color="#b38e62" /></mesh>)}
    {items.map(kind => <group key={kind} position={positions[kind]}><ProjectTool kind={kind} /></group>)}
  </group>;
}

function PlanterBed({ stage, texture }: { stage: BuildStage; texture: THREE.Texture }) {
  const parts = planterParts(stage);
  return <group name={`shared-planter-${stage}`}>
    {parts.includes('base') && <mesh position={[0, .07, 0]} castShadow><SoftBoxGeometry args={[1.2, .13, 1]} /><CraftedWoodMaterial map={texture} color="#b68e60" /></mesh>}
    {parts.includes('frame') && <group name="planter-frame">
      {[-1, 1].map(side => <mesh key={'rail-' + side} position={[0, .28, side * .44]} castShadow><SoftBoxGeometry args={[1.2, .34, .12]} /><CraftedWoodMaterial map={texture} color="#c5aa82" /></mesh>)}
      {[-1, 1].map(side => <mesh key={'end-' + side} position={[side * .54, .28, 0]} castShadow><SoftBoxGeometry args={[.12, .34, .78]} /><CraftedWoodMaterial map={texture} color="#bda077" /></mesh>)}
    </group>}
    {parts.includes('soil') && <mesh position={[0, .31, 0]} scale={[.5, .065, .36]} castShadow><sphereGeometry args={[1, 24, 14]} /><meshStandardMaterial color="#554536" roughness={1} /></mesh>}
    {parts.includes('sprouts') && <group name="planter-sprouts" position={[0, .39, 0]}>
      {[-.34, 0, .34].map((x, index) => <group key={x} position={[x, 0, index % 2 ? .08 : -.08]}>
        <mesh position={[0, .1, 0]}><cylinderGeometry args={[.018, .024, .2, 8]} /><meshStandardMaterial color="#527149" roughness={1} /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * .055, .15 + side * .018, 0]} rotation={[0, 0, side * -.65]} scale={[.075, .035, .025]} castShadow><sphereGeometry args={[1, 16, 10]} /><meshStandardMaterial color={index % 2 ? '#72955d' : '#4d774b'} roughness={1} /></mesh>)}
      </group>)}
    </group>}
  </group>;
}

export default function PlanterProject({ progress, layout, directives, toolAnchors }: {
  progress: PlanterProjection;
  layout: PlanterLayout;
  toolAnchors?: Record<'mallet' | 'can', GardenPoint>;
  directives: Partial<Record<ResidentId, ProjectDirective>>;
}): React.JSX.Element {
  const source = useLoader(THREE.TextureLoader, GARDEN_TEXTURE_PATHS.wood);
  const texture = useMemo(() => prepareGardenTexture(source.clone(), 'wood'), [source]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group name="shared-planter-project">
    {progress.book && <group position={groundGardenPosition(layout.book.x, layout.book.z, .23)}><PictureBook texture={texture} /></group>}
    {progress.supplies !== 'absent' && <group position={groundGardenPosition(layout.basket.x, layout.basket.z, .01)} rotation={[0, -.18, 0]}>
      <SupplyBasket progress={progress} directives={directives} texture={texture} separateTools={!!toolAnchors} />
    </group>}
    {toolAnchors && (['mallet', 'can'] as const).filter(tool => !Object.values(directives).some(d => d.tool === tool)).map(tool =>
      <group key={tool} position={groundGardenPosition(toolAnchors[tool].x, toolAnchors[tool].z, .23)}><ProjectTool kind={tool} /></group>)}
    {progress.stage !== 'empty' && <group position={groundGardenPosition(layout.planter.x, layout.planter.z, .01)} rotation={[0, .08, 0]}>
      <PlanterBed stage={progress.stage} texture={texture} />
    </group>}
  </group>;
}
