'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import CraftedTree from './CraftedTree';
import { getGardenElevation, groundGardenPosition } from './gardenElevation';
import {
  STORYBOOK_FOLIAGE_RADII,
  type EnvironmentInstance,
  type StorybookEnvironmentLayout,
} from './environmentLayout';

export type StorybookFoliageProps = Readonly<{
  layout: StorybookEnvironmentLayout;
  woodTexture?: THREE.Texture;
  grainTexture?: THREE.Texture;
}>;

type InstancedPlantingProps = Readonly<{
  instances: readonly EnvironmentInstance[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  colors: readonly THREE.Color[];
  castShadow?: boolean;
  useInstanceColors?: boolean;
}>;



const UP = new THREE.Vector3(0, 1, 0);

const SHRUB_GEOMETRY = new THREE.SphereGeometry(STORYBOOK_FOLIAGE_RADII.shrubs, 16, 12).translate(0, 0.72, 0);
const GRASS_GEOMETRY = new THREE.SphereGeometry(1, 8, 6).scale(STORYBOOK_FOLIAGE_RADII.grassTufts * .56, .32, STORYBOOK_FOLIAGE_RADII.grassTufts * .22).rotateZ(-.18).translate(0, .3, 0);
const FLOWER_STEM_GEOMETRY = new THREE.CylinderGeometry(0.025, 0.035, 0.58, 6).translate(0, 0.29, 0);
const FLOWER_HEAD_GEOMETRY = new THREE.SphereGeometry(STORYBOOK_FOLIAGE_RADII.flowers, 12, 8).scale(1, .65, 1).translate(0, 0.66, 0);


const SHRUB_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#f4f1db',
  roughness: 1,
  flatShading: false,
});
const GRASS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#f3f0d8', roughness: 1 });
const FLOWER_STEM_MATERIAL = new THREE.MeshStandardMaterial({ color: '#e9ecd5', roughness: 1 });
const FLOWER_HEAD_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#f5efe1',
  emissive: '#cfaed0',
  emissiveIntensity: 0.1,
  roughness: 0.8,
});


const SHRUB_COLORS = ['#819453', '#96a464', '#a9b178'].map((color) => new THREE.Color(color));
const GRASS_COLORS = ['#9aa961', '#a9b572', '#b6be83'].map((color) => new THREE.Color(color));
const STEM_COLORS = ['#4d774b', '#5a8050', '#668957'].map((color) => new THREE.Color(color));
const FLOWER_COLORS = ['#d3dff7', '#edc6dc', '#f0d48b'].map((color) => new THREE.Color(color));



export default function StorybookFoliage({ layout, woodTexture, grainTexture }: StorybookFoliageProps) {
  return (
    <group dispose={null}>
      <InstancedPlanting
        instances={layout.shrubs}
        geometry={SHRUB_GEOMETRY}
        material={SHRUB_MATERIAL}
        colors={SHRUB_COLORS}
        useInstanceColors
      />
      <InstancedPlanting
        instances={layout.grassTufts}
        geometry={GRASS_GEOMETRY}
        material={GRASS_MATERIAL}
        colors={GRASS_COLORS}
        useInstanceColors
      />
      <InstancedPlanting
        instances={layout.flowers}
        geometry={FLOWER_STEM_GEOMETRY}
        material={FLOWER_STEM_MATERIAL}
        colors={STEM_COLORS}
        useInstanceColors
      />
      <InstancedPlanting
        instances={layout.flowers}
        geometry={FLOWER_HEAD_GEOMETRY}
        material={FLOWER_HEAD_MATERIAL}
        colors={FLOWER_COLORS}
        useInstanceColors
      />
      {layout.trees.map((tree) => <CraftedTree key={tree.id} position={groundGardenPosition(tree.position[0], tree.position[2], tree.position[1])} seed={13 + tree.variant * 17} scale={tree.scale[1]} finish="soft" woodTexture={woodTexture} grainTexture={grainTexture} />)}
    </group>
  );
}

function InstancedPlanting({
  instances,
  geometry,
  material,
  colors,
  castShadow = false,
  useInstanceColors = true,
}: InstancedPlantingProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    instances.forEach((item, index) => {
      position.set(...item.position);
      position.y += getGardenElevation(position.x, position.z);
      quaternion.setFromAxisAngle(UP, item.rotationY);
      scale.set(...item.scale);
      matrix.compose(position, quaternion, scale);
      mesh.current?.setMatrixAt(index, matrix);
      if (useInstanceColors) mesh.current?.setColorAt(index, colors[item.variant % colors.length]);
    });
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
      if (useInstanceColors && mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    }
  }, [colors, instances, matrix, position, quaternion, scale, useInstanceColors]);

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
