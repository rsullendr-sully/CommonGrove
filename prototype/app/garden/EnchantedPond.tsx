'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import {
  STORYBOOK_POND_DRESSING_RADII,
  type EnvironmentInstance,
  type EnvironmentPresentation,
  type StorybookEnvironmentLayout,
} from './environmentLayout';
import { getPondMotionFrame } from './environmentMotion';

export type EnchantedPondProps = Readonly<{
  layout: StorybookEnvironmentLayout;
  presentation: EnvironmentPresentation;
}>;

const SHORE_STONE_GEOMETRY = new THREE.DodecahedronGeometry(
  STORYBOOK_POND_DRESSING_RADII.pondStones,
  0,
);
const REED_STALK_GEOMETRY = new THREE.CylinderGeometry(0.035, 0.055, 0.9, 7).translate(0, 0.45, 0);
const REED_TIP_GEOMETRY = new THREE.CylinderGeometry(0.075, 0.065, 0.28, 7).translate(0, 0.98, 0);
const REED_LEAF_GEOMETRY = new THREE.SphereGeometry(0.5, 8, 5).scale(0.55, 0.1, 0.2);
const BANK_FLOWER_STEM_GEOMETRY = new THREE.CylinderGeometry(0.018, 0.026, 0.34, 6).translate(0, 0.17, 0);
const BANK_FLOWER_HEAD_GEOMETRY = new THREE.IcosahedronGeometry(0.11, 0).translate(0, 0.39, 0);

const SHORE_STONE_MATERIALS = ['#a5a18a', '#8d937f', '#b2aa8f'].map((color) => (
  new THREE.MeshStandardMaterial({ color, roughness: 0.96, flatShading: true })
));
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

export default function EnchantedPond({ layout, presentation }: EnchantedPondProps) {
  const ripples = useRef<THREE.Group>(null);
  const firstHighlight = useRef<THREE.Group>(null);
  const secondHighlight = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const frame = getPondMotionFrame(clock.elapsedTime, presentation.rippleMotion);
    if (ripples.current) ripples.current.rotation.z = frame.rippleRotation;
    if (firstHighlight.current) firstHighlight.current.position.x = -1.55 + frame.highlightOffset;
    if (secondHighlight.current) secondHighlight.current.position.z = 1.2 - frame.highlightOffset;
    if (glow.current) glow.current.opacity = presentation.pondGlow * frame.glowPulse * 0.24;
  });

  return (
    <group dispose={null}>
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <cylinderGeometry args={[6.35, 6.35, 0.28, 64]} />
        <meshStandardMaterial color="#314b49" roughness={0.98} />
      </mesh>

      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.9, 64]} />
        <meshPhysicalMaterial
          color="#3f858c"
          transparent
          opacity={0.88}
          roughness={0.28}
          metalness={0.03}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.78, 64]} />
        <meshPhysicalMaterial
          color="#78c6c3"
          transparent
          opacity={0.72}
          roughness={0.15}
          metalness={0.02}
          clearcoat={0.68}
          clearcoatRoughness={0.2}
          depthWrite={false}
        />
      </mesh>

      <group ref={firstHighlight} position={[-1.55, 0.071, -0.72]} rotation={[-Math.PI / 2, 0, -0.18]}>
        <mesh scale={[1.7, 0.58, 1]}>
          <circleGeometry args={[1, 28]} />
          <meshBasicMaterial color="#c9f3e8" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <group ref={secondHighlight} position={[1.72, 0.073, 1.2]} rotation={[-Math.PI / 2, 0, 0.34]}>
        <mesh scale={[1.22, 0.46, 1]}>
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color="#e2f8e9" transparent opacity={0.17} depthWrite={false} />
        </mesh>
      </group>

      <group ref={ripples} position={[0, 0.083, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[2.05, 3.42, 4.72].map((radius, index) => (
          <mesh key={radius}>
            <ringGeometry args={[radius, radius + 0.035, 64]} />
            <meshStandardMaterial
              color="#bcece4"
              emissive="#8fe2dc"
              emissiveIntensity={0.75}
              transparent
              opacity={0.42 - index * 0.08}
              roughness={0.18}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 0.094, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.3, 48]} />
        <meshBasicMaterial
          ref={glow}
          color="#8ce5d7"
          transparent
          opacity={presentation.pondGlow * 0.24}
          depthWrite={false}
        />
      </mesh>

      {layout.pondStones.map((stone, index) => (
        <ShorelineStone key={stone.id} stone={stone} index={index} />
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

function ShorelineStone({ stone, index }: { stone: EnvironmentInstance; index: number }) {
  return (
    <group position={[...stone.position]} rotation={[0, stone.rotationY, 0]} scale={[...stone.scale]}>
      <mesh
        geometry={SHORE_STONE_GEOMETRY}
        material={SHORE_STONE_MATERIALS[stone.variant % SHORE_STONE_MATERIALS.length]}
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
