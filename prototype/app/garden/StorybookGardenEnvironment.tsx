'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
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
import { GARDEN_TEXTURE_PATHS, prepareGardenTexture } from './gardenSurface';

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

const STARFLOWER_STEM_GEOMETRY = new THREE.CylinderGeometry(0.025, 0.035, 0.46, 7);
const STARFLOWER_HEAD_GEOMETRY = new THREE.SphereGeometry(0.13, 8, 6);
const STARFLOWER_STEM_MATERIAL = new THREE.MeshStandardMaterial({ color: '#4d774b' });
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
  const additions = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!additions.current) return;
    const target = improved ? 1 : 0.03;
    const next = reducedMotion ? target : THREE.MathUtils.damp(additions.current.scale.x, target, improved ? 4.2 : 7, delta);
    additions.current.scale.setScalar(next);
  });

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
        <meshStandardMaterial map={woodTexture} color="#8d6555" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.61, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.38, 0.14, 4]} />
        <meshStandardMaterial map={woodTexture} color="#c28e67" roughness={0.88} />
      </mesh>
      {PAVILION_LOCAL_POSTS.map(({ x, z }) => (
        <mesh key={`cap-${x}-${z}`} position={[x, 5.18, z]} castShadow>
          <cylinderGeometry args={[0.31, 0.27, 0.14, 10]} />
          <meshStandardMaterial map={woodTexture} color="#c28e67" roughness={0.88} />
        </mesh>
      ))}
      {PAVILION_LOCAL_BENCHES.map(({ x, z, centerY, width, height, depth }) => (
        <mesh key={`${x}-${z}`} position={[x, centerY, z]} castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial map={woodTexture} color="#bb8761" roughness={0.9} />
        </mesh>
      ))}
      {PAVILION_PERMANENT_FURNITURE.map(({ x, z, centerY, width, height, depth }) => (
        <mesh key={`${x}-${z}`} position={[x, centerY, z]} castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial map={woodTexture} color="#ad7b58" roughness={0.92} />
        </mesh>
      ))}
      <group ref={additions} scale={improved ? 1 : 0.03}>
        <mesh position={[0, 2.86, 0]}>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshStandardMaterial color="#f4cf78" emissive="#e7a957" emissiveIntensity={glow} />
        </mesh>
        {[-0.9, -0.45, 0, 0.45, 0.9].map((x, index) => (
          <mesh key={x} position={[x, 1.32, -1.11]} rotation={[0, 0, (index - 2) * 0.035]} castShadow>
            <boxGeometry args={[0.25, 1.2 - (index % 3) * 0.08, 0.28]} />
            <meshStandardMaterial color={['#ad7658', '#6e8266', '#c59a58', '#7f6d91', '#b98263'][index]} roughness={0.86} />
          </mesh>
        ))}
        {[-1.7, 1.7].map((x) => (
          <group key={x} position={[x, 2.71, 0.25]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.24, 0.5, 8]} />
              <meshStandardMaterial color="#e6b763" emissive="#d99745" emissiveIntensity={glow} />
            </mesh>
            <mesh position={[0, 0.48, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
              <meshStandardMaterial color="#655446" />
            </mesh>
          </group>
        ))}
      </group>
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

function FlowerPatch({
  position,
  headMaterial,
  glow,
}: {
  position: [number, number, number];
  headMaterial: THREE.MeshStandardMaterial;
  glow: number;
}) {
  return (
    <group position={position} dispose={null}>
      {[[-0.7, 0], [-0.2, 0.35], [0.35, -0.2], [0.75, 0.2], [0.1, -0.65]].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh
            geometry={STARFLOWER_STEM_GEOMETRY}
            material={STARFLOWER_STEM_MATERIAL}
            position={[0, 0.24, 0]}
          />
          <mesh
            geometry={STARFLOWER_HEAD_GEOMETRY}
            material={headMaterial}
            material-emissiveIntensity={glow}
            position={[0, 0.52, 0]}
          />
        </group>
      ))}
    </group>
  );
}

function StarflowerPatch({
  glow,
  visible,
  reducedMotion,
}: {
  glow: number;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const flowers = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!flowers.current) return;
    const target = visible ? 1 : 0.04;
    const next = reducedMotion ? target : THREE.MathUtils.damp(flowers.current.scale.x, target, visible ? 4.8 : 7, delta);
    flowers.current.scale.setScalar(next);
  });

  return (
    <group position={[8.2, 0, 6.6]}>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.22, 24]} />
        <meshStandardMaterial color="#596f45" roughness={1} />
      </mesh>
      <group ref={flowers} scale={visible ? 1 : 0.04}>
        <FlowerPatch position={[0, 0, 0]} headMaterial={LAVENDER_STARFLOWER_MATERIAL} glow={glow} />
        <FlowerPatch position={[0.7, 0, 0.55]} headMaterial={GOLD_STARFLOWER_MATERIAL} glow={glow} />
      </group>
    </group>
  );
}

function CuriousSeed({
  glow,
  visible,
  reducedMotion,
}: {
  glow: number;
  visible: boolean;
  reducedMotion: boolean;
}) {
  const discovery = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!discovery.current) return;
    const target = visible ? 1 : 0.03;
    const next = reducedMotion ? target : THREE.MathUtils.damp(discovery.current.scale.x, target, visible ? 4.4 : 7, delta);
    discovery.current.scale.setScalar(next);
    discovery.current.rotation.y = reducedMotion ? 0 : clock.elapsedTime * 0.32;
    const targetY = visible ? 0.72 + Math.sin(clock.elapsedTime * 1.6) * 0.08 : 0.08;
    discovery.current.position.y = reducedMotion ? (visible ? 0.72 : 0.08) : THREE.MathUtils.damp(discovery.current.position.y, targetY, visible ? 4.4 : 7, delta);
  });

  return (
    <group position={[-8.5, 0, 7.4]}>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.7, 1.1, 20]} />
        <meshStandardMaterial color="#c8bea1" roughness={0.96} />
      </mesh>
      <group ref={discovery} position={[0, 0.72, 0]} scale={visible ? 1 : 0.03}>
        <mesh castShadow>
          <dodecahedronGeometry args={[0.42, 1]} />
          <meshStandardMaterial
            color="#d2ad59"
            roughness={0.48}
            emissive="#9d7938"
            emissiveIntensity={glow}
            flatShading
          />
        </mesh>
        <mesh position={[-0.28, 0.38, 0]} rotation={[0.1, 0, -0.72]} scale={[0.34, 0.12, 0.18]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#68865a" roughness={0.88} />
        </mesh>
        <mesh position={[0.28, 0.38, 0]} rotation={[0.1, 0, 0.72]} scale={[0.34, 0.12, 0.18]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#789664" roughness={0.88} />
        </mesh>
      </group>
    </group>
  );
}

function ChoiceDestination({
  choice,
  glow,
  reducedMotion,
}: {
  choice: GardenChoice | null;
  glow: number;
  reducedMotion: boolean;
}) {
  const destination = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!destination.current) return;
    const target = choice ? 1 : 0.03;
    const next = reducedMotion ? target : THREE.MathUtils.damp(destination.current.scale.x, target, choice ? 3.5 : 7, delta);
    destination.current.scale.setScalar(next);
  });

  return (
    <group position={[-13, 0, 11]}>
      {choice && (
        <group ref={destination} scale={0.03}>
          {[[-9.7, 8.5], [-10.8, 9.5], [-12, 10.2]].map(([x, z], index) => (
            <mesh key={index} position={[x + 10.7, 0.045, z - 9.4]} scale={[0.9, 0.1, 0.58]} castShadow receiveShadow>
              <cylinderGeometry args={[0.65, 0.72, 0.22, 9]} />
              <meshStandardMaterial color="#d2c6a5" roughness={0.95} />
            </mesh>
          ))}
          {choice === 'orchard' ? (
            <group>
              {[[-1.5, 0], [1.25, 0.7], [0, -1.35]].map(([x, z], index) => (
                <group key={index} position={[x, 0, z]}>
                  <mesh position={[0, 1.2, 0]} castShadow>
                    <cylinderGeometry args={[0.15, 0.23, 2.4, 8]} />
                    <meshStandardMaterial color="#7f6047" roughness={0.95} />
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
                </group>
              ))}
            </group>
          ) : (
            <group>
              <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[2.25, 2.5, 0.48, 8]} />
                <meshStandardMaterial color="#c0ad89" roughness={0.94} />
              </mesh>
              <mesh position={[0, 1.15, 0]} castShadow>
                <boxGeometry args={[3.2, 1.35, 2.3]} />
                <meshStandardMaterial color="#a97b55" roughness={0.9} />
              </mesh>
              <mesh position={[0, 2.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                <coneGeometry args={[2.65, 1.2, 4]} />
                <meshStandardMaterial color="#765f55" roughness={0.88} />
              </mesh>
              <mesh position={[0, 1.05, 1.2]} castShadow>
                <boxGeometry args={[2.1, 0.22, 0.7]} />
                <meshStandardMaterial
                  color="#8ca5cf"
                  emissive="#c58b65"
                  emissiveIntensity={glow}
                  roughness={0.82}
                />
              </mesh>
              {[-0.55, 0, 0.55].map((x, index) => (
                <mesh key={x} position={[x, 1.55 + index * 0.08, 1.18]} rotation={[0, 0, index * 0.3 - 0.3]}>
                  <boxGeometry args={[0.16, 0.7, 0.16]} />
                  <meshStandardMaterial color={index === 1 ? '#6a8065' : '#d0b064'} roughness={0.8} />
                </mesh>
              ))}
            </group>
          )}
          <pointLight
            position={[0, 2.1, 0.7]}
            color={choice === 'orchard' ? '#d7b85a' : '#8ca5cf'}
            intensity={glow * 0.6}
            distance={7.5}
            decay={2}
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
    earth: prepareGardenTexture(earthSource.clone(), 'earth'),
    limestone: prepareGardenTexture(limestoneSource.clone(), 'limestone'),
    wood: prepareGardenTexture(woodSource.clone(), 'wood'),
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
    finishTextures.earth.dispose();
    finishTextures.limestone.dispose();
    finishTextures.wood.dispose();
  }, [finishTextures]);

  return (
    <>
      <MagicalAtmosphere layout={layout} presentation={presentation} />

      <StorybookTerrain
        grassTexture={grassTexture}
        earthTexture={finishTextures.earth}
        limestoneTexture={finishTextures.limestone}
        layout={layout}
      />

      <EnchantedPond
        layout={layout}
        presentation={presentation}
        earthTexture={finishTextures.earth}
        limestoneTexture={finishTextures.limestone}
      />
      <RockBackdrop limestoneTexture={finishTextures.limestone} />
      <SpringSanctuary
        glow={presentation.sanctuaryGlow}
        reducedMotion={!presentation.moteMotion}
        limestoneTexture={finishTextures.limestone}
      />
      <Pavilion
        glow={presentation.pavilionGlow}
        improved={presentation.pavilionGlow > 0.55}
        reducedMotion={!presentation.cloudMotion}
        limestoneTexture={finishTextures.limestone}
        woodTexture={finishTextures.wood}
      />
      <StorybookFoliage layout={layout} />
      <StarflowerPatch
        glow={presentation.starflowerGlow}
        visible={presentation.starflowerGlow > 0.2}
        reducedMotion={!presentation.moteMotion}
      />
      <CuriousSeed
        glow={presentation.seedGlow}
        visible={presentation.seedGlow > 0.15}
        reducedMotion={!presentation.moteMotion}
      />
      <ChoiceDestination
        choice={presentation.destinationAccent}
        glow={presentation.destinationGlow}
        reducedMotion={!presentation.moteMotion}
      />
    </>
  );
}
