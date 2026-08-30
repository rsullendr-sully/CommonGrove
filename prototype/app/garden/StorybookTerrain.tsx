'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Texture } from 'three';
import type { GardenCorridor, StorybookEnvironmentLayout } from './environmentLayout';

export type StorybookTerrainProps = Readonly<{
  grassTexture: Texture;
  layout: StorybookEnvironmentLayout;
}>;

type BoundaryHedge = Readonly<{
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY: number;
  variant: number;
}>;

type SteppingStone = Readonly<{
  id: string;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY: number;
  variant: number;
}>;

const UP = new THREE.Vector3(0, 1, 0);
const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const BERM_GEOMETRY = new THREE.CylinderGeometry(1, 1.08, 0.64, 10);
const BED_GEOMETRY = new THREE.CylinderGeometry(1, 1, 0.08, 18);
const STONE_GEOMETRY = new THREE.CylinderGeometry(1, 1.08, 0.18, 10);
const HEDGE_GEOMETRY = new THREE.DodecahedronGeometry(1, 1).translate(0, 1, 0);

const OUTER_GRASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#789963', roughness: 1 });
const BERM_MATERIALS = ['#6f8e58', '#78955d', '#688651'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
));
const BED_MATERIALS = ['#526d43', '#5d7748', '#637d4c'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 1 })
));
const STONE_MATERIALS = ['#d8cdac', '#c9bea0', '#d3ba91', '#c4ae8c'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 0.98, flatShading: true })
));
const HEDGE_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: '#35543a',
  emissiveIntensity: 0.18,
  roughness: 1,
  flatShading: true,
  vertexColors: true,
});
const HEDGE_COLORS = ['#557b52', '#63875a', '#729262', '#7e9d69'].map((color) => new THREE.Color(color));

const boundaryHedges = createBoundaryHedges();

export default function StorybookTerrain({ grassTexture, layout }: StorybookTerrainProps) {
  const grassMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: grassTexture,
    color: '#ffffff',
    roughness: 1,
  }), [grassTexture]);
  const steppingStones = useMemo(() => createSteppingStones(layout.corridors), [layout.corridors]);

  useEffect(() => () => grassMaterial.dispose(), [grassMaterial]);

  return (
    <group dispose={null}>
      <mesh
        geometry={PLANE_GEOMETRY}
        material={OUTER_GRASS_MATERIAL}
        position={[0, -0.26, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[120, 120, 1]}
        receiveShadow
      />
      <mesh
        geometry={PLANE_GEOMETRY}
        material={grassMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[40, 40, 1]}
        receiveShadow
      />

      {layout.berms.map((berm, index) => (
        <mesh
          key={berm.id}
          geometry={BERM_GEOMETRY}
          material={BERM_MATERIALS[index % BERM_MATERIALS.length]}
          position={[berm.center.x, 0.08, berm.center.z]}
          rotation={[0, index * 0.71, 0]}
          scale={[berm.radius * 1.06, 0.65, berm.radius * (index % 2 ? 0.58 : 0.66)]}
          receiveShadow
        />
      ))}

      {layout.plantingBeds.flatMap((bed, index) => [
        <mesh
          key={`${bed.id}-base`}
          geometry={BED_GEOMETRY}
          material={BED_MATERIALS[index % BED_MATERIALS.length]}
          position={[bed.center.x, 0.012, bed.center.z]}
          rotation={[0, index * 0.47, 0]}
          scale={[bed.radius, 0.7, bed.radius * 0.68]}
          receiveShadow
        />,
        <mesh
          key={`${bed.id}-overlap`}
          geometry={BED_GEOMETRY}
          material={BED_MATERIALS[(index + 1) % BED_MATERIALS.length]}
          position={[bed.center.x + bed.radius * 0.18, 0.018, bed.center.z - bed.radius * 0.12]}
          rotation={[0, index * 0.47 + 0.82, 0]}
          scale={[bed.radius * 0.78, 0.72, bed.radius * 0.56]}
          receiveShadow
        />,
      ])}

      {steppingStones.map((stone) => (
        <mesh
          key={stone.id}
          geometry={STONE_GEOMETRY}
          material={STONE_MATERIALS[stone.variant]}
          position={[...stone.position]}
          rotation={[0, stone.rotationY, 0]}
          scale={[...stone.scale]}
          receiveShadow
        />
      ))}

      <BoundaryHedges />
    </group>
  );
}

function BoundaryHedges() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    boundaryHedges.forEach((hedge, index) => {
      position.set(...hedge.position);
      quaternion.setFromAxisAngle(UP, hedge.rotationY);
      scale.set(...hedge.scale);
      matrix.compose(position, quaternion, scale);
      mesh.current?.setMatrixAt(index, matrix);
      mesh.current?.setColorAt(index, HEDGE_COLORS[hedge.variant]);
    });
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    }
  }, [matrix, position, quaternion, scale]);

  return (
    <instancedMesh
      ref={mesh}
      args={[HEDGE_GEOMETRY, HEDGE_MATERIAL, boundaryHedges.length]}
      receiveShadow
      dispose={null}
    />
  );
}

function createBoundaryHedges(): BoundaryHedge[] {
  const hedges: BoundaryHedge[] = [];
  for (let value = -18; value <= 18; value += 3) {
    const index = (value + 18) / 3;
    const stagger = index % 2 ? 0.38 : -0.32;
    const height = 0.88 + (index % 4) * 0.07;
    hedges.push(
      { position: [value + stagger, 0, -19.25], scale: [1.55, height, 1.1], rotationY: index * 0.31, variant: index % 4 },
      { position: [value - stagger, 0, 19.25], scale: [1.48, height * 0.92, 1.08], rotationY: -index * 0.27, variant: (index + 1) % 4 },
      { position: [-19.25, 0, value - stagger], scale: [1.08, height * 0.96, 1.5], rotationY: index * 0.29, variant: (index + 2) % 4 },
      { position: [19.25, 0, value + stagger], scale: [1.1, height * 0.9, 1.52], rotationY: -index * 0.33, variant: (index + 3) % 4 },
    );
  }
  return hedges;
}

function createSteppingStones(corridors: readonly GardenCorridor[]): SteppingStone[] {
  return corridors.flatMap((corridor, corridorIndex) => {
    const count = corridor.id === 'spawn-to-pond' ? 5 : 4;
    const dx = corridor.end.x - corridor.start.x;
    const dz = corridor.end.z - corridor.start.z;
    const length = Math.hypot(dx, dz);
    const perpendicular = { x: -dz / length, z: dx / length };
    return Array.from({ length: count }, (_, index) => {
      const progress = (index + 1) / (count + 1);
      const offset = ((index + corridorIndex) % 3 - 1) * 0.16;
      return {
        id: `${corridor.id}-stone-${index + 1}`,
        position: [
          corridor.start.x + dx * progress + perpendicular.x * offset,
          0.055 + (index % 2) * 0.006,
          corridor.start.z + dz * progress + perpendicular.z * offset,
        ] as const,
        scale: [0.76 + (index % 3) * 0.08, 0.72, 0.52 + ((index + 1) % 2) * 0.08] as const,
        rotationY: Math.atan2(-dz, dx) + (index % 2 ? 0.08 : -0.06),
        variant: (index + corridorIndex) % STONE_MATERIALS.length,
      };
    });
  });
}
