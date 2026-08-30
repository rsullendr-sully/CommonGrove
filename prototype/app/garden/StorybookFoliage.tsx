'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  STORYBOOK_FOLIAGE_RADII,
  type EnvironmentInstance,
  type StorybookEnvironmentLayout,
} from './environmentLayout';

export type StorybookFoliageProps = Readonly<{
  layout: StorybookEnvironmentLayout;
}>;

type InstancedPlantingProps = Readonly<{
  instances: readonly EnvironmentInstance[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  colors: readonly THREE.Color[];
  castShadow?: boolean;
}>;

type CanopyCluster = Readonly<{
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  color: number;
}>;

const UP = new THREE.Vector3(0, 1, 0);

const SHRUB_GEOMETRY = new THREE.DodecahedronGeometry(STORYBOOK_FOLIAGE_RADII.shrubs, 1).translate(0, 0.72, 0);
const GRASS_GEOMETRY = new THREE.ConeGeometry(STORYBOOK_FOLIAGE_RADII.grassTufts, 0.92, 5).translate(0, 0.46, 0);
const FLOWER_STEM_GEOMETRY = new THREE.CylinderGeometry(0.025, 0.035, 0.58, 6).translate(0, 0.29, 0);
const FLOWER_HEAD_GEOMETRY = new THREE.IcosahedronGeometry(STORYBOOK_FOLIAGE_RADII.flowers, 1).translate(0, 0.66, 0);
const TREE_TRUNK_GEOMETRY = new THREE.CylinderGeometry(0.25, 0.43, 4.15, 9).translate(0, 2.075, 0);
const TREE_CANOPY_GEOMETRY = new THREE.DodecahedronGeometry(1, 1);
const TREE_TIP_GEOMETRY = new THREE.IcosahedronGeometry(0.26, 1);
const ROOT_STONE_GEOMETRY = new THREE.DodecahedronGeometry(0.34, 0);

const SHRUB_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: '#35543a',
  emissiveIntensity: 0.16,
  roughness: 1,
  flatShading: true,
  vertexColors: true,
});
const GRASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, vertexColors: true });
const FLOWER_STEM_MATERIAL = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, vertexColors: true });
const FLOWER_HEAD_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: '#6f685e',
  emissiveIntensity: 0.08,
  roughness: 0.8,
  vertexColors: true,
});
const TREE_TRUNK_MATERIAL = new THREE.MeshStandardMaterial({ color: '#806149', roughness: 1, flatShading: true });
const TREE_LEAF_MATERIALS = ['#426b4c', '#587d50', '#72905c'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
));
const TREE_TIP_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#72905c',
  emissive: '#72905c',
  emissiveIntensity: 0.2,
  roughness: 0.82,
  flatShading: true,
});
const ROOT_STONE_MATERIALS = ['#827e69', '#918a72', '#747664'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
));

const SHRUB_COLORS = ['#5f8758', '#71945f', '#829e6b'].map((color) => new THREE.Color(color));
const GRASS_COLORS = ['#73945f', '#89a56c', '#9ab576'].map((color) => new THREE.Color(color));
const STEM_COLORS = ['#4d774b', '#5a8050', '#668957'].map((color) => new THREE.Color(color));
const FLOWER_COLORS = ['#d3dff7', '#edc6dc', '#f0d48b'].map((color) => new THREE.Color(color));

const canopyVariants: readonly (readonly CanopyCluster[])[] = [
  [
    { position: [0, 4.75, 0], scale: [1.2, 1.05, 1.05], color: 0 },
    { position: [-0.88, 4.32, 0.16], scale: [1.02, 0.92, 0.94], color: 1 },
    { position: [0.72, 4.42, -0.24], scale: [1.08, 0.96, 0.9], color: 2 },
    { position: [0.16, 4.08, 0.82], scale: [0.92, 0.84, 0.88], color: 1 },
    { position: [-0.24, 5.34, -0.18], scale: [0.78, 0.72, 0.76], color: 2 },
  ],
  [
    { position: [-0.12, 4.7, 0.04], scale: [1.16, 1, 1.08], color: 1 },
    { position: [-0.76, 4.46, -0.42], scale: [0.96, 0.88, 0.92], color: 0 },
    { position: [0.88, 4.34, 0.12], scale: [1, 0.9, 0.9], color: 2 },
    { position: [0.36, 4.02, 0.8], scale: [0.88, 0.78, 0.86], color: 0 },
    { position: [-0.42, 5.22, 0.42], scale: [0.82, 0.76, 0.78], color: 2 },
    { position: [0.46, 5.18, -0.4], scale: [0.72, 0.68, 0.74], color: 1 },
  ],
  [
    { position: [0.08, 4.68, -0.08], scale: [1.18, 1.02, 1.04], color: 2 },
    { position: [-0.9, 4.22, -0.12], scale: [0.98, 0.9, 0.9], color: 0 },
    { position: [0.78, 4.38, 0.34], scale: [1.04, 0.92, 0.96], color: 1 },
    { position: [-0.1, 4.02, 0.88], scale: [0.9, 0.8, 0.86], color: 2 },
    { position: [0.28, 5.3, -0.34], scale: [0.8, 0.72, 0.78], color: 1 },
  ],
];

const rootStones = [
  { position: [-0.48, 0.22, 0.22] as const, scale: [0.9, 0.56, 0.72] as const, rotationY: 0.3 },
  { position: [0.42, 0.16, 0.34] as const, scale: [0.68, 0.45, 0.82] as const, rotationY: -0.52 },
  { position: [0.18, 0.14, -0.5] as const, scale: [0.62, 0.4, 0.7] as const, rotationY: 0.78 },
];

export default function StorybookFoliage({ layout }: StorybookFoliageProps) {
  return (
    <group dispose={null}>
      <InstancedPlanting
        instances={layout.shrubs}
        geometry={SHRUB_GEOMETRY}
        material={SHRUB_MATERIAL}
        colors={SHRUB_COLORS}
        castShadow
      />
      <InstancedPlanting
        instances={layout.grassTufts}
        geometry={GRASS_GEOMETRY}
        material={GRASS_MATERIAL}
        colors={GRASS_COLORS}
      />
      <InstancedPlanting
        instances={layout.flowers}
        geometry={FLOWER_STEM_GEOMETRY}
        material={FLOWER_STEM_MATERIAL}
        colors={STEM_COLORS}
      />
      <InstancedPlanting
        instances={layout.flowers}
        geometry={FLOWER_HEAD_GEOMETRY}
        material={FLOWER_HEAD_MATERIAL}
        colors={FLOWER_COLORS}
      />
      {layout.trees.map((tree) => <StorybookTree key={tree.id} tree={tree} />)}
    </group>
  );
}

function InstancedPlanting({
  instances,
  geometry,
  material,
  colors,
  castShadow = false,
}: InstancedPlantingProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    instances.forEach((item, index) => {
      position.set(...item.position);
      quaternion.setFromAxisAngle(UP, item.rotationY);
      scale.set(...item.scale);
      matrix.compose(position, quaternion, scale);
      mesh.current?.setMatrixAt(index, matrix);
      mesh.current?.setColorAt(index, colors[item.variant % colors.length]);
    });
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    }
  }, [colors, instances, matrix, position, quaternion, scale]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, instances.length]}
      castShadow={castShadow}
      receiveShadow={castShadow}
      dispose={null}
    />
  );
}

function StorybookTree({ tree }: { tree: EnvironmentInstance }) {
  const canopies = canopyVariants[tree.variant % canopyVariants.length];
  return (
    <group position={[...tree.position]} rotation={[0, tree.rotationY, 0]} scale={[...tree.scale]}>
      <mesh geometry={TREE_TRUNK_GEOMETRY} material={TREE_TRUNK_MATERIAL} castShadow receiveShadow dispose={null} />
      {canopies.map((canopy, index) => (
        <mesh
          key={index}
          geometry={TREE_CANOPY_GEOMETRY}
          material={TREE_LEAF_MATERIALS[canopy.color]}
          position={[...canopy.position]}
          rotation={[index * 0.11, index * 0.53, -index * 0.07]}
          scale={[...canopy.scale]}
          castShadow
          dispose={null}
        />
      ))}
      <mesh
        geometry={TREE_TIP_GEOMETRY}
        material={TREE_TIP_MATERIAL}
        position={[tree.variant === 1 ? -0.5 : 0.38, 5.65, tree.variant === 2 ? 0.2 : -0.18]}
        castShadow
        dispose={null}
      />
      {rootStones.map((stone, index) => (
        <mesh
          key={index}
          geometry={ROOT_STONE_GEOMETRY}
          material={ROOT_STONE_MATERIALS[(tree.variant + index) % ROOT_STONE_MATERIALS.length]}
          position={[...stone.position]}
          rotation={[0, stone.rotationY, 0]}
          scale={[...stone.scale]}
          castShadow
          receiveShadow
          dispose={null}
        />
      ))}
    </group>
  );
}
