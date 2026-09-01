'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Texture } from 'three';
import {
  createStorybookEnvironmentLayout,
  getEnvironmentPresentation,
} from './environmentLayout';
import EnchantedPond from './EnchantedPond';
import MagicalAtmosphere from './MagicalAtmosphere';
import type { GardenChoice } from './rewardState';
import {
  PAVILION_CENTER,
  PAVILION_LOCAL_BENCHES,
  PAVILION_LOCAL_POSTS,
  PAVILION_PERMANENT_FURNITURE,
  PAVILION_SURFACE,
} from './pavilionLayout';
import StorybookFoliage from './StorybookFoliage';
import StorybookTerrain from './StorybookTerrain';
import { createGardenTextureVariant, GARDEN_TEXTURE_PATHS } from './gardenSurface';
import {
  advanceRewardRevealPlayback,
  getRewardAuraPresentation,
  getRewardRevealDuration,
  getRewardRevealFrame,
  INITIAL_REWARD_REVEAL_PLAYBACK,
  type RewardRevealFrame,
  type RewardRevealPlayback,
  type RewardRevealProfile,
} from './rewardReveal';

export type StorybookGardenEnvironmentProps = Readonly<{
  grassTexture: Texture;
  rewardStage: number;
  starflowersVisible: boolean;
  pavilionImproved: boolean;
  seedVisible: boolean;
  destinationVisible: GardenChoice | null;
  reducedMotion: boolean;
}>;

const rockData: Array<{ position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number]; color: string }> = [
  { position: [-5.2, 2.7, -16.3], scale: [5.15, 4.05, 3.1], rotation: [0.2, 0.15, -0.08], color: '#758064' },
  { position: [0, 4.3, -17.1], scale: [5.45, 5.65, 3.3], rotation: [0.05, 0.35, 0.08], color: '#68765d' },
  { position: [5.2, 2.8, -16.1], scale: [4.95, 4.2, 3.2], rotation: [-0.1, -0.2, 0.12], color: '#81886d' },
  { position: [-2.7, 6.8, -17.5], scale: [3, 2.9, 2.35], rotation: [0.1, 0.4, -0.15], color: '#748063' },
  { position: [2.5, 7, -17.7], scale: [3.3, 2.75, 2.4], rotation: [-0.15, 0.1, 0.18], color: '#6c795f' },
];

const STARFLOWER_STEM_GEOMETRY = new THREE.CylinderGeometry(0.025, 0.035, 1, 7);
const STARFLOWER_PETAL_GEOMETRY = new THREE.SphereGeometry(1, 10, 6);
const STARFLOWER_CENTER_GEOMETRY = new THREE.IcosahedronGeometry(0.11, 1);
const STARFLOWER_LEAF_GEOMETRY = new THREE.SphereGeometry(1, 8, 5);
const REWARD_AURA_MOTE_GEOMETRY = new THREE.IcosahedronGeometry(0.045, 0);
const STARFLOWER_STEM_MATERIAL = new THREE.MeshStandardMaterial({ color: '#4d774b' });
const STARFLOWER_LEAF_MATERIAL = new THREE.MeshStandardMaterial({ color: '#6f915f', roughness: 0.92 });
const STARFLOWER_CENTER_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#d8a75f',
  emissive: '#c68d48',
  emissiveIntensity: 0.25,
  roughness: 0.72,
});
const LAVENDER_STARFLOWER_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#e6c5ef',
  roughness: 0.8,
  emissive: '#e6c5ef',
  emissiveIntensity: 0.2,
});
const GOLD_STARFLOWER_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#f3d58e',
  roughness: 0.8,
  emissive: '#f3d58e',
  emissiveIntensity: 0.2,
});

function useRewardRevealGroup({
  visible,
  reducedMotion,
  profile,
  delaySeconds = 0,
  baseY = 0,
}: {
  visible: boolean;
  reducedMotion: boolean;
  profile: RewardRevealProfile;
  delaySeconds?: number;
  baseY?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const playback = useRef<RewardRevealPlayback>(INITIAL_REWARD_REVEAL_PLAYBACK);
  const frame = useRef<RewardRevealFrame>(getRewardRevealFrame({
    elapsedSeconds: 0,
    visible,
    reducedMotion,
    profile,
    delaySeconds,
  }));

  useFrame((_, delta) => {
    const previousPlayback = playback.current;
    const nextPlayback = advanceRewardRevealPlayback(previousPlayback, {
      visible,
      reducedMotion,
      deltaSeconds: delta,
      settleAfterSeconds: getRewardRevealDuration(profile) + delaySeconds,
    });
    if (nextPlayback === previousPlayback && nextPlayback.completed) return;
    playback.current = nextPlayback;
    frame.current = getRewardRevealFrame({
      elapsedSeconds: playback.current.elapsedSeconds,
      visible,
      reducedMotion: reducedMotion || playback.current.completed,
      profile,
      delaySeconds,
    });
    const current = frame.current;
    if (group.current) {
      group.current.visible = visible;
      group.current.scale.set(current.scale, current.scaleY, current.scale);
      group.current.position.y = baseY + current.rise;
    }
  });

  return { group, frame };
}

function RewardRevealAura({
  visible,
  reducedMotion,
  profile,
  radius,
  color,
}: {
  visible: boolean;
  reducedMotion: boolean;
  profile: RewardRevealProfile;
  radius: number;
  color: string;
}) {
  const { group: reveal, frame } = useRewardRevealGroup({ visible, reducedMotion, profile, baseY: 0.035 });
  const aura = useRef<THREE.Group>(null);
  const innerRing = useRef<THREE.MeshBasicMaterial>(null);
  const outerRing = useRef<THREE.MeshBasicMaterial>(null);
  const moteMaterials = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const intensity = frame.current.aura;
    const presentation = getRewardAuraPresentation(frame.current);
    if (aura.current) {
      aura.current.visible = presentation.visible;
      aura.current.rotation.z = presentation.rotationEnabled && !reducedMotion ? clock.elapsedTime * 0.18 : 0;
      const auraScale = Math.max(0.02, 0.78 + intensity * 0.42);
      aura.current.scale.setScalar(auraScale);
    }
    moteMaterials.current.forEach((material) => {
      if (material) material.opacity = presentation.moteOpacity;
    });
    if (innerRing.current) innerRing.current.opacity = intensity * 0.34;
    if (outerRing.current) outerRing.current.opacity = intensity * 0.18;
    if (light.current) light.current.intensity = intensity * 1.25 * frame.current.glowBoost;
  });

  return (
    <group ref={reveal} position={[0, 0.035, 0]} scale={0.02} visible={visible}>
      <group ref={aura} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.68, radius * 0.75, 48]} />
          <meshBasicMaterial ref={innerRing} color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.92, radius, 48]} />
          <meshBasicMaterial ref={outerRing} color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2;
          return (
            <mesh
              key={index}
              geometry={REWARD_AURA_MOTE_GEOMETRY}
              position={[Math.cos(angle) * radius * 0.82, 0.08 + (index % 3) * 0.09, Math.sin(angle) * radius * 0.82]}
              scale={0.75 + (index % 2) * 0.3}
            >
              <meshBasicMaterial
                ref={(material) => {
                  moteMaterials.current[index] = material;
                }}
                color={color}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
          );
        })}
        <pointLight ref={light} position={[0, 0.55, 0]} color={color} intensity={0} distance={radius * 4.5} decay={2} />
      </group>
    </group>
  );
}

function RewardRevealPart({
  children,
  visible,
  reducedMotion,
  profile,
  delaySeconds = 0,
  position = [0, 0, 0],
}: {
  children: ReactNode;
  visible: boolean;
  reducedMotion: boolean;
  profile: RewardRevealProfile;
  delaySeconds?: number;
  position?: readonly [number, number, number];
}) {
  const { group } = useRewardRevealGroup({
    visible,
    reducedMotion,
    profile,
    delaySeconds,
    baseY: position[1],
  });

  return (
    <group ref={group} position={[...position]} scale={0.035} visible={visible}>
      {children}
    </group>
  );
}

function RockBackdrop({ limestoneTexture }: { limestoneTexture: Texture }) {
  return (
    <group>
      {rockData.map((rock, index) => (
        <mesh key={index} position={rock.position} scale={rock.scale} rotation={rock.rotation} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial map={limestoneTexture} color={rock.color} roughness={0.98} flatShading />
        </mesh>
      ))}
      {[-4.1, -1.2, 2.1, 4.4].map((x, index) => (
        <mesh key={x} position={[x, 7.3 + (index % 2) * 1.2, -15.9]} scale={[1.4, 0.32, 1]} rotation={[-0.15, index * 0.5, 0.1]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#718965" roughness={1} />
        </mesh>
      ))}
      {[[-7.8, 0.55, -13.6], [-6.7, 0.38, -15], [7.2, 0.52, -14.4], [8.1, 0.32, -16]].map((position, index) => (
        <mesh key={`base-${index}`} position={position as [number, number, number]} scale={[1.5 - index * 0.1, 1.05, 1.15]} rotation={[0.2, index * 0.8, 0.1]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index % 2 ? '#98927a' : '#888a71'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function SpringSanctuary({
  glow,
  reducedMotion,
  limestoneTexture,
}: {
  glow: number;
  reducedMotion: boolean;
  limestoneTexture: Texture;
}) {
  const water = useRef<THREE.MeshPhysicalMaterial>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.opacity = reducedMotion ? 0.7 : 0.64 + Math.sin(clock.elapsedTime * 1.8) * 0.08;
  });
  return (
    <group position={[0, 0, -8.4]}>
      <mesh position={[0, 1.9, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 3.8, 0.8]} />
        <meshStandardMaterial map={limestoneTexture} color="#d7cdb1" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.95, 0.05]} castShadow>
        <boxGeometry args={[5.5, 0.45, 1.15]} />
        <meshStandardMaterial map={limestoneTexture} color="#f0dfb9" roughness={0.82} />
      </mesh>
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} position={[x, 2, 0.65]} castShadow>
          <cylinderGeometry args={[0.34, 0.42, 3.8, 12]} />
          <meshStandardMaterial map={limestoneTexture} color="#e4d6b7" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.1, 0.72]}>
        <planeGeometry args={[2.55, 2.9]} />
        <meshPhysicalMaterial
          ref={water}
          color="#89cbd0"
          emissive="#77d6d0"
          emissiveIntensity={glow}
          transparent
          opacity={0.7}
          roughness={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 2.1, 0.75]}>
        <planeGeometry args={[2.08, 2.42]} />
        <meshBasicMaterial color="#d9f4e8" transparent opacity={0.16 + glow * 0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.42, 1.1]} castShadow>
        <cylinderGeometry args={[1.55, 1.8, 0.65, 32]} />
        <meshStandardMaterial map={limestoneTexture} color="#ddcfb1" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.79, 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.36, 32]} />
        <meshPhysicalMaterial color="#6db2b7" roughness={0.1} clearcoat={0.7} />
      </mesh>
      <pointLight
        position={[0, 2.4, 1.2]}
        color="#b7eff0"
        intensity={glow * 0.55}
        distance={7}
        decay={2}
      />
    </group>
  );
}

function Pavilion({
  glow,
  improved,
  reducedMotion,
  limestoneTexture,
  woodTexture,
}: {
  glow: number;
  improved: boolean;
  reducedMotion: boolean;
  limestoneTexture: Texture;
  woodTexture: Texture;
}) {
  const bookColors = ['#a86752', '#667d65', '#c19252', '#77698b', '#9b705d', '#58737b'];

  return (
    <group position={[PAVILION_CENTER.x, 0, PAVILION_CENTER.z]}>
      <mesh position={[0, PAVILION_SURFACE.deck.centerY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[
          PAVILION_SURFACE.deck.radiusTop,
          PAVILION_SURFACE.deck.radiusBottom,
          PAVILION_SURFACE.deck.height,
          12,
        ]} />
        <meshStandardMaterial map={limestoneTexture} color="#d8c89f" roughness={0.94} />
      </mesh>
      {PAVILION_LOCAL_POSTS.map(({ x, z }) => (
        <mesh key={`${x}-${z}`} position={[x, 2.66, z]} castShadow>
          <cylinderGeometry args={[0.19, 0.25, 5, 10]} />
          <meshStandardMaterial map={woodTexture} color="#ad8060" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, 5.31, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.3, 1.5, 4]} />
        <meshStandardMaterial color="#8d6555" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.61, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.38, 0.14, 4]} />
        <meshStandardMaterial color="#c28e67" roughness={0.88} />
      </mesh>
      {PAVILION_LOCAL_POSTS.map(({ x, z }) => (
        <mesh key={`cap-${x}-${z}`} position={[x, 5.18, z]} castShadow>
          <cylinderGeometry args={[0.31, 0.27, 0.14, 10]} />
          <meshStandardMaterial color="#c28e67" roughness={0.88} />
        </mesh>
      ))}
      {PAVILION_LOCAL_BENCHES.map(({ x, z, centerY, width, height, depth }) => (
        <mesh key={`${x}-${z}`} position={[x, centerY, z]} castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#bb8761" roughness={0.9} />
        </mesh>
      ))}
      {PAVILION_PERMANENT_FURNITURE.map(({ x, z, centerY, width, height, depth }) => (
        <mesh key={`${x}-${z}`} position={[x, centerY, z]} castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#ad7b58" roughness={0.92} />
        </mesh>
      ))}
      <RewardRevealPart
        visible={improved}
        reducedMotion={reducedMotion}
        profile="structure"
        position={[0, 0, -1.28]}
      >
          {[-1.42, 1.42].map((x) => (
            <mesh key={`shelf-post-${x}`} position={[x, 1.66, 0]} castShadow>
              <boxGeometry args={[0.18, 2.75, 0.38]} />
              <meshStandardMaterial map={woodTexture} color="#986f52" roughness={0.92} />
            </mesh>
          ))}
          {[0.38, 1.22, 2.06, 2.92].map((y) => (
            <mesh key={`shelf-${y}`} position={[0, y, 0]} castShadow>
              <boxGeometry args={[3.02, 0.16, 0.5]} />
              <meshStandardMaterial map={woodTexture} color="#a97a58" roughness={0.9} />
            </mesh>
          ))}
          {Array.from({ length: 15 }, (_, index) => {
            const row = Math.floor(index / 5);
            const column = index % 5;
            const height = 0.48 + ((index * 3) % 4) * 0.055;
            return (
              <mesh
                key={`book-${index}`}
                position={[-1.02 + column * 0.5, 0.54 + row * 0.84 + height / 2, -0.02]}
                rotation={[0, 0, (column - 2) * 0.025]}
                castShadow
              >
                <boxGeometry args={[0.25 + (index % 2) * 0.04, height, 0.32]} />
                <meshStandardMaterial color={bookColors[index % bookColors.length]} roughness={0.86} />
              </mesh>
            );
          })}
          <mesh position={[0, 3.16, 0]} castShadow>
            <boxGeometry args={[3.35, 0.2, 0.58]} />
            <meshStandardMaterial map={woodTexture} color="#855f48" roughness={0.92} />
          </mesh>
      </RewardRevealPart>
      {[-1.7, 1.7].map((x, index) => (
          <RewardRevealPart
            key={x}
            visible={improved}
            reducedMotion={reducedMotion}
            profile="structure"
            delaySeconds={0.22 + index * 0.14}
            position={[x, 2.64, 0.25]}
          >
            <mesh position={[0, 0.38, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
              <meshStandardMaterial color="#665344" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.02, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.26, 0.12, 8]} />
              <meshStandardMaterial color="#8a674f" metalness={0.05} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.21, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.16, 0.48, 8]} />
              <meshStandardMaterial color="#f2c16f" emissive="#e2a454" emissiveIntensity={glow * 0.75} roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.48, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.2, 0.1, 8]} />
              <meshStandardMaterial color="#765b49" roughness={0.85} />
            </mesh>
          </RewardRevealPart>
      ))}
      <RewardRevealAura
        visible={improved}
        reducedMotion={reducedMotion}
        profile="structure"
        radius={3.15}
        color="#f0c982"
      />
      <pointLight
        position={[0, 2.86, 0]}
        color="#ffd88a"
        intensity={improved ? glow * 0.75 : 0}
        distance={8}
        decay={2}
      />
      {PAVILION_SURFACE.approachSteps.map(({ z, centerY, height, width, depth }) => (
        <mesh key={z} position={[0, centerY, z]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial map={limestoneTexture} color="#dfd1b3" roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

function BloomingFlower({
  position,
  height,
  rotationY,
  petalMaterial,
  glow,
  visible,
  reducedMotion,
  delaySeconds,
}: {
  position: readonly [number, number, number];
  height: number;
  rotationY: number;
  petalMaterial: THREE.MeshStandardMaterial;
  glow: number;
  visible: boolean;
  reducedMotion: boolean;
  delaySeconds: number;
}) {
  const { group } = useRewardRevealGroup({
    visible,
    reducedMotion,
    profile: 'flower',
    delaySeconds,
    baseY: position[1],
  });

  return (
    <group ref={group} position={[...position]} rotation={[0, rotationY, 0]} scale={0.035} visible={visible} dispose={null}>
      <mesh
        geometry={STARFLOWER_STEM_GEOMETRY}
        material={STARFLOWER_STEM_MATERIAL}
        position={[0, height / 2, 0]}
        scale={[1, height, 1]}
      />
      <mesh
        geometry={STARFLOWER_LEAF_GEOMETRY}
        material={STARFLOWER_LEAF_MATERIAL}
        position={[0.09, height * 0.48, 0]}
        rotation={[0.08, 0.25, -0.55]}
        scale={[0.18, 0.035, 0.075]}
      />
      <group position={[0, height, 0]} rotation={[0.12, 0, -0.08]}>
        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * Math.PI * 2;
          return (
            <mesh
              key={index}
              geometry={STARFLOWER_PETAL_GEOMETRY}
              material={petalMaterial}
              material-emissiveIntensity={glow * 0.18}
              position={[Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18]}
              rotation={[0, -angle, 0]}
              scale={[0.22, 0.055, 0.1]}
              castShadow
            />
          );
        })}
        <mesh geometry={STARFLOWER_CENTER_GEOMETRY} material={STARFLOWER_CENTER_MATERIAL} position={[0, 0.025, 0]} />
      </group>
    </group>
  );
}

const STARFLOWER_CLUSTER = [
  { position: [-0.7, 0, 0] as const, height: 0.84, rotationY: -0.4 },
  { position: [-0.2, 0, 0.35] as const, height: 1.02, rotationY: 0.25 },
  { position: [0.35, 0, -0.2] as const, height: 0.92, rotationY: -0.1 },
  { position: [0.75, 0, 0.2] as const, height: 1.14, rotationY: 0.5 },
  { position: [0.1, 0, -0.65] as const, height: 0.96, rotationY: -0.6 },
] as const;

function FlowerPatch({
  position,
  petalMaterial,
  glow,
  visible,
  reducedMotion,
  delayOffset,
}: {
  position: readonly [number, number, number];
  petalMaterial: THREE.MeshStandardMaterial;
  glow: number;
  visible: boolean;
  reducedMotion: boolean;
  delayOffset: number;
}) {
  return (
    <group position={[...position]} dispose={null}>
      {STARFLOWER_CLUSTER.map((flower, index) => (
        <BloomingFlower
          key={`${flower.position[0]}-${flower.position[2]}`}
          {...flower}
          petalMaterial={petalMaterial}
          glow={glow}
          visible={visible}
          reducedMotion={reducedMotion}
          delaySeconds={delayOffset + index * 0.055}
        />
      ))}
    </group>
  );
}

function StarflowerPatch({
  glow,
  visible,
  reducedMotion,
  earthTexture,
  limestoneTexture,
}: {
  glow: number;
  visible: boolean;
  reducedMotion: boolean;
  earthTexture: Texture;
  limestoneTexture: Texture;
}) {
  return (
    <group position={[6.35, 0, 6.6]}>
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <cylinderGeometry args={[1.34, 1.44, 0.09, 24]} />
        <meshStandardMaterial map={earthTexture} color="#7d7652" roughness={1} />
      </mesh>
      {[[-1.16, 0.12], [0.92, -0.76], [0.8, 0.9], [-0.55, -1.02]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.13, z]} rotation={[0.2, index * 0.8, 0.12]} scale={[0.23, 0.14, 0.18]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial map={limestoneTexture} color={index % 2 ? '#d6c7aa' : '#c8bea2'} roughness={0.96} flatShading />
        </mesh>
      ))}
      <FlowerPatch position={[-0.32, 0.09, -0.08]} petalMaterial={LAVENDER_STARFLOWER_MATERIAL} glow={glow} visible={visible} reducedMotion={reducedMotion} delayOffset={0} />
      <FlowerPatch position={[0.52, 0.09, 0.42]} petalMaterial={GOLD_STARFLOWER_MATERIAL} glow={glow} visible={visible} reducedMotion={reducedMotion} delayOffset={0.18} />
      <RewardRevealAura visible={visible} reducedMotion={reducedMotion} profile="flower" radius={1.5} color="#d8c5f0" />
    </group>
  );
}

function CuriousSeed({
  glow,
  visible,
  reducedMotion,
  earthTexture,
  limestoneTexture,
}: {
  glow: number;
  visible: boolean;
  reducedMotion: boolean;
  earthTexture: Texture;
  limestoneTexture: Texture;
}) {
  return (
    <group position={[-8.5, 0, 7.4]}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.18, 0.12, 24]} />
        <meshStandardMaterial map={earthTexture} color="#776f4e" roughness={1} />
      </mesh>
      {[[-0.92, -0.22], [0.72, -0.66], [0.78, 0.58]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.15, z]} rotation={[0.15, index * 0.7, 0.08]} scale={[0.22, 0.15, 0.2]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial map={limestoneTexture} color={index % 2 ? '#d0c3a6' : '#bdb79d'} roughness={0.97} flatShading />
        </mesh>
      ))}
      <group position={[0, 0.66, 0]} rotation={[0, 0.25, 0]}>
        <RewardRevealPart visible={visible} reducedMotion={reducedMotion} profile="seed">
          <mesh position={[0, -0.05, 0]} scale={[0.62, 0.78, 0.56]} castShadow>
            <sphereGeometry args={[1, 18, 12]} />
            <meshStandardMaterial color="#c7944d" roughness={0.66} emissive="#b47c35" emissiveIntensity={0.12 + glow * 0.42} />
          </mesh>
          <mesh position={[0, 0.55, 0]} scale={[0.65, 0.21, 0.59]} castShadow>
            <sphereGeometry args={[1, 16, 8]} />
            <meshStandardMaterial color="#765637" roughness={0.92} />
          </mesh>
          <pointLight position={[0, 0.25, 0]} color="#e8bf67" intensity={visible ? 0.5 + glow * 0.35 : 0} distance={4.5} decay={2} />
        </RewardRevealPart>
        <RewardRevealPart visible={visible} reducedMotion={reducedMotion} profile="seed" delaySeconds={0.18}>
          <mesh position={[0.03, 0.83, 0]} rotation={[0.12, 0, -0.16]} castShadow>
            <cylinderGeometry args={[0.04, 0.065, 0.65, 7]} />
            <meshStandardMaterial color="#557149" roughness={0.94} />
          </mesh>
        </RewardRevealPart>
        <RewardRevealPart visible={visible} reducedMotion={reducedMotion} profile="seed" delaySeconds={0.32}>
          <mesh position={[-0.3, 0.94, 0]} rotation={[0.05, -0.2, -0.58]} scale={[0.42, 0.12, 0.22]} castShadow>
            <sphereGeometry args={[1, 12, 7]} />
            <meshStandardMaterial color="#66885b" roughness={0.9} />
          </mesh>
        </RewardRevealPart>
        <RewardRevealPart visible={visible} reducedMotion={reducedMotion} profile="seed" delaySeconds={0.41}>
          <mesh position={[0.32, 1.08, 0.02]} rotation={[0.05, 0.2, 0.62]} scale={[0.44, 0.13, 0.23]} castShadow>
            <sphereGeometry args={[1, 12, 7]} />
            <meshStandardMaterial color="#789a63" roughness={0.9} />
          </mesh>
        </RewardRevealPart>
      </group>
      <RewardRevealAura visible={visible} reducedMotion={reducedMotion} profile="seed" radius={1.35} color="#d5b66a" />
    </group>
  );
}

function ChoiceDestination({
  choice,
  glow,
  reducedMotion,
  limestoneTexture,
  woodTexture,
}: {
  choice: GardenChoice | null;
  glow: number;
  reducedMotion: boolean;
  limestoneTexture: Texture;
  woodTexture: Texture;
}) {
  return (
    <group position={[-13, 0, 11]}>
      {choice && (
        <group>
          <RewardRevealPart visible reducedMotion={reducedMotion} profile="destination">
            {[[-9.7, 8.5], [-10.8, 9.5], [-12, 10.2]].map(([x, z], index) => (
              <mesh key={index} position={[x + 10.7, 0.045, z - 9.4]} scale={[0.9, 0.1, 0.58]} castShadow receiveShadow>
                <cylinderGeometry args={[0.65, 0.72, 0.22, 9]} />
                <meshStandardMaterial map={limestoneTexture} color="#d2c6a5" roughness={0.95} />
              </mesh>
            ))}
          </RewardRevealPart>
          {choice === 'orchard' ? (
            <group>
              {[[-1.5, 0], [1.25, 0.7], [0, -1.35]].map(([x, z], index) => (
                <RewardRevealPart
                  key={index}
                  visible
                  reducedMotion={reducedMotion}
                  profile="destination"
                  delaySeconds={0.16 + index * 0.17}
                  position={[x, 0, z]}
                >
                  <mesh position={[0, 1.2, 0]} castShadow>
                    <cylinderGeometry args={[0.15, 0.23, 2.4, 8]} />
                    <meshStandardMaterial map={woodTexture} color="#7f6047" roughness={0.95} />
                  </mesh>
                  <mesh position={[0, 2.65, 0]} scale={[1.05, 0.9, 1]} castShadow>
                    <dodecahedronGeometry args={[1, 1]} />
                    <meshStandardMaterial color={index % 2 ? '#668457' : '#587a54'} roughness={1} flatShading />
                  </mesh>
                  <mesh position={[0.35, 2.25, 0.55]}>
                    <sphereGeometry args={[0.16, 12, 8]} />
                    <meshStandardMaterial
                      color="#d7b85a"
                      emissive="#7fa65b"
                      emissiveIntensity={glow}
                    />
                  </mesh>
                </RewardRevealPart>
              ))}
            </group>
          ) : (
            <group>
              <RewardRevealPart visible reducedMotion={reducedMotion} profile="destination">
                <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[2.25, 2.5, 0.48, 8]} />
                  <meshStandardMaterial map={limestoneTexture} color="#c0ad89" roughness={0.94} />
                </mesh>
              </RewardRevealPart>
              <RewardRevealPart visible reducedMotion={reducedMotion} profile="destination" delaySeconds={0.15}>
                <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
                  <boxGeometry args={[3.35, 1.65, 2.35]} />
                  <meshStandardMaterial map={woodTexture} color="#aa805d" roughness={0.92} />
                </mesh>
                {[-1.52, 0, 1.52].map((x) => (
                  <mesh key={`workshop-frame-${x}`} position={[x, 1.3, 1.2]} castShadow>
                    <boxGeometry args={[0.16, 1.82, 0.16]} />
                    <meshStandardMaterial map={woodTexture} color="#76533f" roughness={0.92} />
                  </mesh>
                ))}
                <mesh position={[0, 2.06, 1.22]} castShadow>
                  <boxGeometry args={[3.38, 0.17, 0.18]} />
                  <meshStandardMaterial map={woodTexture} color="#76533f" roughness={0.92} />
                </mesh>
              </RewardRevealPart>
              <RewardRevealPart visible reducedMotion={reducedMotion} profile="destination" delaySeconds={0.38}>
                <mesh position={[0, 2.52, -0.58]} rotation={[0.42, 0, 0]} castShadow>
                  <boxGeometry args={[3.95, 0.18, 1.9]} />
                  <meshStandardMaterial color="#7a5d50" roughness={0.91} />
                </mesh>
                <mesh position={[0, 2.52, 0.58]} rotation={[-0.42, 0, 0]} castShadow>
                  <boxGeometry args={[3.95, 0.18, 1.9]} />
                  <meshStandardMaterial color="#866653" roughness={0.91} />
                </mesh>
                <mesh position={[1.12, 3.02, -0.42]} castShadow>
                  <boxGeometry args={[0.42, 1.05, 0.42]} />
                  <meshStandardMaterial map={limestoneTexture} color="#a99c82" roughness={0.96} />
                </mesh>
                <mesh position={[1.12, 3.58, -0.42]} castShadow>
                  <boxGeometry args={[0.58, 0.13, 0.58]} />
                  <meshStandardMaterial color="#786759" roughness={0.94} />
                </mesh>
              </RewardRevealPart>
              <RewardRevealPart visible reducedMotion={reducedMotion} profile="destination" delaySeconds={0.29}>
                <mesh position={[0.58, 1.1, 1.22]} castShadow>
                <boxGeometry args={[1.25, 1.55, 0.12]} />
                <meshStandardMaterial
                  color="#71869a"
                  emissive="#c58b65"
                  emissiveIntensity={glow * 0.12}
                  roughness={0.82}
                />
              </mesh>
              <mesh position={[-0.82, 1.42, 1.24]} castShadow>
                <boxGeometry args={[0.9, 0.72, 0.12]} />
                <meshPhysicalMaterial color="#9cc4c1" emissive="#79aaa5" emissiveIntensity={0.18} roughness={0.24} clearcoat={0.35} />
              </mesh>
              <mesh position={[-0.82, 1.42, 1.31]}>
                <boxGeometry args={[0.08, 0.75, 0.08]} />
                <meshStandardMaterial color="#70513e" roughness={0.9} />
              </mesh>
              <mesh position={[-0.82, 1.42, 1.31]} rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.08, 0.92, 0.08]} />
                <meshStandardMaterial color="#70513e" roughness={0.9} />
              </mesh>
              <group position={[-0.95, 0.72, 1.82]}>
                <mesh position={[0, 0.32, 0]} castShadow>
                  <boxGeometry args={[1.25, 0.16, 0.62]} />
                  <meshStandardMaterial map={woodTexture} color="#8c674c" roughness={0.94} />
                </mesh>
                {[-0.48, 0.48].map((x) => (
                  <mesh key={x} position={[x, -0.02, 0]} castShadow>
                    <boxGeometry args={[0.12, 0.68, 0.12]} />
                    <meshStandardMaterial map={woodTexture} color="#75533e" roughness={0.94} />
                  </mesh>
                ))}
                <mesh position={[0.28, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.19, 0.055, 8, 12]} />
                  <meshStandardMaterial color="#c69a54" metalness={0.18} roughness={0.7} />
                </mesh>
                <mesh position={[-0.3, 0.58, 0]} rotation={[0, 0, -0.5]}>
                  <boxGeometry args={[0.11, 0.6, 0.1]} />
                  <meshStandardMaterial color="#6f7c73" metalness={0.16} roughness={0.66} />
                </mesh>
              </group>
              <pointLight position={[0.3, 1.55, 1.85]} color="#f0b967" intensity={glow * 0.55} distance={6} decay={2} />
              </RewardRevealPart>
            </group>
          )}
          <pointLight
            position={[0, 2.1, 0.7]}
            color={choice === 'orchard' ? '#d7b85a' : '#8ca5cf'}
            intensity={glow * 0.6}
            distance={7.5}
            decay={2}
          />
          <RewardRevealAura
            visible={Boolean(choice)}
            reducedMotion={reducedMotion}
            profile="destination"
            radius={3.1}
            color={choice === 'orchard' ? '#d4bd6e' : '#93acd2'}
          />
        </group>
      )}
    </group>
  );
}

export default function StorybookGardenEnvironment({
  grassTexture,
  rewardStage,
  starflowersVisible,
  pavilionImproved,
  seedVisible,
  destinationVisible,
  reducedMotion,
}: StorybookGardenEnvironmentProps) {
  const [earthSource, limestoneSource, woodSource] = useLoader(
    THREE.TextureLoader,
    [
      GARDEN_TEXTURE_PATHS.earth,
      GARDEN_TEXTURE_PATHS.limestone,
      GARDEN_TEXTURE_PATHS.wood,
    ],
  );
  const finishTextures = useMemo(() => ({
    earthTerrain: createGardenTextureVariant(earthSource, 'earth', [5, 8]),
    earthPond: createGardenTextureVariant(earthSource, 'earth', [12, 12]),
    limestoneArchitecture: createGardenTextureVariant(limestoneSource, 'limestone', [4, 3]),
    limestoneSmall: createGardenTextureVariant(limestoneSource, 'limestone', [1, 1]),
    limestoneRock: createGardenTextureVariant(limestoneSource, 'limestone', [6, 4]),
    woodPosts: createGardenTextureVariant(woodSource, 'wood', [2, 5]),
  }), [earthSource, limestoneSource, woodSource]);
  const layout = useMemo(() => createStorybookEnvironmentLayout(), []);
  const presentation = useMemo(
    () => getEnvironmentPresentation({
      rewardStage,
      starflowersVisible,
      pavilionImproved,
      seedVisible,
      destinationVisible,
      reducedMotion,
    }),
    [
      destinationVisible,
      pavilionImproved,
      reducedMotion,
      rewardStage,
      seedVisible,
      starflowersVisible,
    ],
  );

  useEffect(() => () => {
    Object.values(finishTextures).forEach((texture) => texture.dispose());
  }, [finishTextures]);

  return (
    <>
      <MagicalAtmosphere layout={layout} presentation={presentation} />

      <StorybookTerrain
        grassTexture={grassTexture}
        earthTexture={finishTextures.earthTerrain}
        limestoneTexture={finishTextures.limestoneSmall}
        layout={layout}
      />

      <EnchantedPond
        layout={layout}
        presentation={presentation}
        earthTexture={finishTextures.earthPond}
        limestoneTexture={finishTextures.limestoneSmall}
      />
      <RockBackdrop limestoneTexture={finishTextures.limestoneRock} />
      <SpringSanctuary
        glow={presentation.sanctuaryGlow}
        reducedMotion={!presentation.moteMotion}
        limestoneTexture={finishTextures.limestoneArchitecture}
      />
      <Pavilion
        glow={presentation.pavilionGlow}
        improved={presentation.pavilionGlow > 0.55}
        reducedMotion={!presentation.cloudMotion}
        limestoneTexture={finishTextures.limestoneArchitecture}
        woodTexture={finishTextures.woodPosts}
      />
      <StorybookFoliage layout={layout} />
      <StarflowerPatch
        glow={presentation.starflowerGlow}
        visible={presentation.starflowerGlow > 0.2}
        reducedMotion={!presentation.moteMotion}
        earthTexture={finishTextures.earthTerrain}
        limestoneTexture={finishTextures.limestoneSmall}
      />
      <CuriousSeed
        glow={presentation.seedGlow}
        visible={presentation.seedGlow > 0.15}
        reducedMotion={!presentation.moteMotion}
        earthTexture={finishTextures.earthTerrain}
        limestoneTexture={finishTextures.limestoneSmall}
      />
      <ChoiceDestination
        choice={presentation.destinationAccent}
        glow={presentation.destinationGlow}
        reducedMotion={!presentation.moteMotion}
        limestoneTexture={finishTextures.limestoneSmall}
        woodTexture={finishTextures.woodPosts}
      />
    </>
  );
}
