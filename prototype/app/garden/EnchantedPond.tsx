'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Texture } from 'three';
import {
  STORYBOOK_POND_DRESSING_RADII,
  type EnvironmentInstance,
  type EnvironmentPresentation,
  type StorybookEnvironmentLayout,
} from './environmentLayout';
import SanctuaryWater from './SanctuaryWater';
import { createPondOutline, type PondOutlinePoint } from './pondShape';

export type EnchantedPondProps = Readonly<{
  layout: StorybookEnvironmentLayout;
  presentation: EnvironmentPresentation;
  earthTexture: Texture;
  limestoneTexture: Texture;
}>;

const SHORE_STONE_GEOMETRY = new THREE.SphereGeometry(STORYBOOK_POND_DRESSING_RADII.pondStones, 16, 10);
const REED_STALK_GEOMETRY = new THREE.CylinderGeometry(0.035, 0.055, 0.9, 7).translate(0, 0.45, 0);
const REED_TIP_GEOMETRY = new THREE.CylinderGeometry(0.075, 0.065, 0.28, 7).translate(0, 0.98, 0);
const REED_LEAF_GEOMETRY = new THREE.SphereGeometry(0.5, 8, 5).scale(0.55, 0.1, 0.2);
const BANK_FLOWER_STEM_GEOMETRY = new THREE.CylinderGeometry(0.018, 0.026, 0.34, 6).translate(0, 0.17, 0);
const BANK_FLOWER_HEAD_GEOMETRY = new THREE.SphereGeometry(0.11, 10, 8).scale(1, .7, 1).translate(0, 0.39, 0);

const SHORE_STONE_COLORS = ['#eee0bd', '#ddd2b3', '#ead8ad'] as const;
const REED_STALK_MATERIALS = ['#527957', '#65875b', '#789461'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 0.94, flatShading: true })
));
const REED_TIP_MATERIAL = new THREE.MeshStandardMaterial({ color: '#80664f', roughness: 0.98, flatShading: true });
const REED_LEAF_MATERIALS = ['#64875d', '#779865', '#87a46e'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true })
));
const BANK_FLOWER_STEM_MATERIAL = new THREE.MeshStandardMaterial({ color: '#557a50', roughness: 0.96 });
const BANK_FLOWER_HEAD_MATERIALS = ['#f0d8a0', '#d9c8ee', '#e8b9cf'].map((color) => (
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.12,
    roughness: 0.8,
    flatShading: true,
  })
));

function createOutlineGeometry(points: readonly PondOutlinePoint[]) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z);
  for (let index = 1; index < points.length; index += 1) {
    shape.lineTo(points[index].x, points[index].z);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 8);
}

export default function EnchantedPond({
  layout,
  presentation,
  earthTexture,
  limestoneTexture,
}: EnchantedPondProps) {
  const pondGeometry = useMemo(() => ({
    bank: createOutlineGeometry(createPondOutline(6.35, 0.2, 64, 1.2)),
    depth: createOutlineGeometry(createPondOutline(6.04, 0.16, 64, 0.35)),
    water: createOutlineGeometry(createPondOutline(5.78, 0.12, 64, 0.82)),
  }), []);
  const shoreStoneMaterials = useMemo(() => SHORE_STONE_COLORS.map((color) => (
    new THREE.MeshStandardMaterial({
      map: limestoneTexture,
      color,
      roughness: 0.96,
      bumpMap: limestoneTexture,
      bumpScale: .018,
    })
  )), [limestoneTexture]);

  useEffect(() => () => {
    pondGeometry.bank.dispose();
    pondGeometry.depth.dispose();
    pondGeometry.water.dispose();
    shoreStoneMaterials.forEach((material) => material.dispose());
  }, [pondGeometry, shoreStoneMaterials]);

  return (
    <group dispose={null}>
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <cylinderGeometry args={[6.18, 6.22, 0.28, 64]} />
        <meshStandardMaterial map={earthTexture} color="#708066" roughness={0.98} />
      </mesh>

      <mesh geometry={pondGeometry.bank} position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial map={limestoneTexture} color="#d8cba5" roughness={0.98} />
      </mesh>

      <mesh geometry={pondGeometry.depth} position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshPhysicalMaterial
          color="#365e5d"
          transparent
          opacity={0.96}
          roughness={0.34}
          metalness={0.03}
          depthWrite={false}
        />
      </mesh>

      <SanctuaryWater geometry={pondGeometry.water} motion={presentation.rippleMotion} glow={presentation.pondGlow} />

      {layout.pondStones.map((stone, index) => (
        <ShorelineStone
          key={stone.id}
          stone={stone}
          index={index}
          materials={shoreStoneMaterials}
        />
      ))}
      {layout.reeds.map((reeds) => <ReedCluster key={reeds.id} reeds={reeds} />)}

      <pointLight
        position={[0, 1.35, 0]}
        color="#9ce8df"
        intensity={presentation.pondGlow * 1.65}
        distance={7.5}
        decay={2}
      />
    </group>
  );
}

function ShorelineStone({
  stone,
  index,
  materials,
}: {
  stone: EnvironmentInstance;
  index: number;
  materials: readonly THREE.MeshStandardMaterial[];
}) {
  return (
    <group position={[...stone.position]} rotation={[0, stone.rotationY, 0]} scale={[...stone.scale]}>
      <mesh
        geometry={SHORE_STONE_GEOMETRY}
        material={materials[stone.variant % materials.length]}
        castShadow
        receiveShadow
        dispose={null}
      />
      {index % 4 === 1 && (
        <group position={[0.08, 0.15, -0.04]}>
          <mesh geometry={BANK_FLOWER_STEM_GEOMETRY} material={BANK_FLOWER_STEM_MATERIAL} dispose={null} />
          <mesh
            geometry={BANK_FLOWER_HEAD_GEOMETRY}
            material={BANK_FLOWER_HEAD_MATERIALS[stone.variant % BANK_FLOWER_HEAD_MATERIALS.length]}
            dispose={null}
          />
        </group>
      )}
    </group>
  );
}

function ReedCluster({ reeds }: { reeds: EnvironmentInstance }) {
  const stalkMaterial = REED_STALK_MATERIALS[reeds.variant % REED_STALK_MATERIALS.length];
  const leafMaterial = REED_LEAF_MATERIALS[reeds.variant % REED_LEAF_MATERIALS.length];
  return (
    <group position={[...reeds.position]} rotation={[0, reeds.rotationY, 0]} scale={[...reeds.scale]}>
      {[-0.16, 0, 0.16].map((x, index) => (
        <group key={x} position={[x, 0, index === 1 ? 0.1 : -0.08]} rotation={[0, 0, (index - 1) * 0.08]}>
          <mesh geometry={REED_STALK_GEOMETRY} material={stalkMaterial} dispose={null} />
          {index !== 1 && <mesh geometry={REED_TIP_GEOMETRY} material={REED_TIP_MATERIAL} dispose={null} />}
        </group>
      ))}
      <mesh
        geometry={REED_LEAF_GEOMETRY}
        material={leafMaterial}
        position={[0.1, 0.32, 0.08]}
        rotation={[0.1, -0.5, 0.45]}
        dispose={null}
      />
      <mesh
        geometry={REED_LEAF_GEOMETRY}
        material={leafMaterial}
        position={[-0.08, 0.22, -0.06]}
        rotation={[-0.08, 0.55, -0.52]}
        dispose={null}
      />
    </group>
  );
}
