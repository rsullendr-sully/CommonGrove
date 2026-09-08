'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Texture } from 'three';
import { createGardenGroundGeometry, getGardenElevation, groundGardenPosition } from './gardenElevation';
import { createCraftedLawnMaterial } from './gardenCraft';
import type { GardenCorridor, StorybookEnvironmentLayout } from './environmentLayout';

export type StorybookTerrainProps = Readonly<{
  grassTexture: Texture;
  earthTexture: Texture;
  limestoneTexture: Texture;
  layout: StorybookEnvironmentLayout;
}>;

type BoundaryHedge = Readonly<{
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY: number;
  variant: number;
}>;

export type SteppingStone = Readonly<{
  id: string;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY: number;
  variant: number;
}>;

export type GardenPathBed = Readonly<{
  id: string;
  position: readonly [number, number, number];
  length: number;
  width: number;
  rotationY: number;
  variant: number;
}>;

const UP = new THREE.Vector3(0, 1, 0);
export const STEPPING_STONE_HEIGHT = 0.06;
const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const GROUND_GEOMETRY = createGardenGroundGeometry();
const BERM_GEOMETRY = new THREE.CylinderGeometry(1, 1.08, 0.64, 10);
const BED_GEOMETRY = new THREE.SphereGeometry(1, 20, 12).scale(1, .04, 1);
const STONE_GEOMETRY = new THREE.SphereGeometry(1, 16, 10).scale(1, STEPPING_STONE_HEIGHT / 2, 1);
const PATH_GEOMETRY = new THREE.CircleGeometry(1, 28);
const HEDGE_GEOMETRY = new THREE.DodecahedronGeometry(1, 2).translate(0, 1, 0);

const OUTER_GRASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#96a965', roughness: 1 });
const BERM_MATERIALS = ['#98a665', '#a2ad71', '#8e9f5e'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 1 })
));
const BED_COLORS = ['#a39471', '#ae9b78', '#9b8f6a'] as const;
const PATH_COLORS = ['#bdb18e', '#b5aa88', '#c3b694'] as const;
const STONE_COLORS = ['#f0e3c5', '#dfd0b0', '#ead5aa', '#d9c29d'] as const;
const HEDGE_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#95a65d', roughness: 1,
});
const boundaryHedges = createBoundaryHedges();

export default function StorybookTerrain({
  grassTexture,
  earthTexture,
  limestoneTexture,
  layout,
}: StorybookTerrainProps) {
  const grassMaterial = useMemo(() => createCraftedLawnMaterial(grassTexture), [grassTexture]);
  const pathMaterials = useMemo(() => PATH_COLORS.map((color) => (
    new THREE.MeshStandardMaterial({
      map: earthTexture,
      color,
      roughness: 1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  )), [earthTexture]);
  const soilMaterials = useMemo(() => createSoilMaterials(earthTexture), [earthTexture]);
  const stoneMaterials = useMemo(() => STONE_COLORS.map((color) => new THREE.MeshStandardMaterial({
    map: limestoneTexture,
    color,
    roughness: 0.96,
    bumpMap: limestoneTexture,
    bumpScale: .015,
  })), [limestoneTexture]);
  const steppingStones = useMemo(() => createSteppingStones(layout.corridors), [layout.corridors]);
  const pathBeds = useMemo(() => createGardenPathBeds(layout.corridors), [layout.corridors]);

  useEffect(() => () => {
    grassMaterial.dispose();
    pathMaterials.forEach((material) => material.dispose());
    soilMaterials.forEach((material) => material.dispose());
    stoneMaterials.forEach((material) => material.dispose());
  }, [grassMaterial, pathMaterials, soilMaterials, stoneMaterials]);

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
        geometry={GROUND_GEOMETRY}
        material={grassMaterial}
        receiveShadow
      />

      {layout.berms.map((berm, index) => (
        <mesh
          key={berm.id}
          geometry={BERM_GEOMETRY}
          material={BERM_MATERIALS[index % BERM_MATERIALS.length]}
          position={groundGardenPosition(berm.center.x, berm.center.z, 0.08)}
          rotation={[0, index * 0.71, 0]}
          scale={[berm.radius * 1.06, 0.65, berm.radius * (index % 2 ? 0.58 : 0.66)]}
          receiveShadow
        />
      ))}

      {layout.plantingBeds.flatMap((bed, index) => [
        <mesh
          key={`${bed.id}-base`}
          geometry={BED_GEOMETRY}
          material={soilMaterials[index % soilMaterials.length]}
          position={groundGardenPosition(bed.center.x, bed.center.z, 0.012)}
          rotation={[0, index * 0.47, 0]}
          scale={[bed.radius, 0.7, bed.radius * 0.68]}
          receiveShadow
        />,
        <mesh
          key={`${bed.id}-overlap`}
          geometry={BED_GEOMETRY}
          material={soilMaterials[(index + 1) % soilMaterials.length]}
          position={groundGardenPosition(bed.center.x + bed.radius * 0.18, bed.center.z - bed.radius * 0.12, 0.018)}
          rotation={[0, index * 0.47 + 0.82, 0]}
          scale={[bed.radius * 0.78, 0.72, bed.radius * 0.56]}
          receiveShadow
        />,
      ])}

      {pathBeds.filter((bed) => getGardenElevation(bed.position[0], bed.position[2]) === 0).map((bed) => (
        <group key={bed.id} position={[...bed.position]} rotation={[0, bed.rotationY, 0]}>
          <mesh
            geometry={PATH_GEOMETRY}
            material={pathMaterials[bed.variant]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[bed.width, bed.length / 2, 1]}
            receiveShadow
          />
        </group>
      ))}

      {steppingStones.map((stone) => (
        <mesh
          key={stone.id}
          geometry={STONE_GEOMETRY}
          material={stoneMaterials[stone.variant]}
          position={groundGardenPosition(stone.position[0], stone.position[2], stone.position[1])}
          rotation={[0, stone.rotationY, 0]}
          scale={[...stone.scale]}
          receiveShadow
        />
      ))}

      <BoundaryHedges />
    </group>
  );
}

export function createSoilMaterials(earthTexture: Texture) {
  return BED_COLORS.map((color) => new THREE.MeshStandardMaterial({
    map: earthTexture,
    color,
    roughness: 1,
  }));
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
      position.y += getGardenElevation(position.x, position.z);
      quaternion.setFromAxisAngle(UP, hedge.rotationY);
      scale.set(...hedge.scale);
      matrix.compose(position, quaternion, scale);
      mesh.current?.setMatrixAt(index, matrix);
    });
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrix, position, quaternion, scale]);

  return (
    <instancedMesh
      ref={mesh}
      args={[HEDGE_GEOMETRY, HEDGE_MATERIAL, boundaryHedges.length]}
      dispose={null}
    />
  );
}

function createBoundaryHedges(): BoundaryHedge[] {
  const hedges: BoundaryHedge[] = [];
  for (let value = -18; value <= 18; value += 3) {
    const index = (value + 18) / 3;
    const stagger = index % 2 ? 0.38 : -0.32;
    const height = 0.72 + (index % 4) * 0.07;
    hedges.push(
      { position: [value + stagger, 0, -19.25], scale: [1.32, height, 0.94], rotationY: index * 0.31, variant: index % 4 },
      { position: [value - stagger, 0, 19.25], scale: [1.26, height * 0.94, 0.92], rotationY: -index * 0.27, variant: (index + 1) % 4 },
      { position: [-19.25, 0, value - stagger], scale: [0.92, height * 0.96, 1.28], rotationY: index * 0.29, variant: (index + 2) % 4 },
      { position: [19.25, 0, value + stagger], scale: [0.94, height * 0.92, 1.3], rotationY: -index * 0.33, variant: (index + 3) % 4 },
    );
  }
  return hedges;
}

export function createSteppingStones(corridors: readonly GardenCorridor[]): SteppingStone[] {
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
          -0.005,
          corridor.start.z + dz * progress + perpendicular.z * offset,
        ] as const,
        scale: [0.38 + (index % 3) * 0.05, 0.72, 0.28 + ((index + 1) % 2) * 0.05] as const,
        rotationY: Math.atan2(-dz, dx) + (index % 2 ? 0.08 : -0.06),
        variant: (index + corridorIndex) % STONE_COLORS.length,
      };
    });
  });
}

export function createGardenPathBeds(corridors: readonly GardenCorridor[]): GardenPathBed[] {
  return corridors.map((corridor, index) => {
    const dx = corridor.end.x - corridor.start.x;
    const dz = corridor.end.z - corridor.start.z;
    return {
      id: `${corridor.id}-path-bed`,
      position: [
        (corridor.start.x + corridor.end.x) / 2,
        0.004,
        (corridor.start.z + corridor.end.z) / 2,
      ] as const,
      length: Math.hypot(dx, dz) + 0.8,
      width: Math.max(0.78, Math.min(1.08, corridor.halfWidth * 0.76)),
      rotationY: Math.atan2(dx, dz),
      variant: index % PATH_COLORS.length,
    };
  });
}
