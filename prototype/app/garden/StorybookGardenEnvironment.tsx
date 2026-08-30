'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Texture } from 'three';
import {
  createStorybookEnvironmentLayout,
  getEnvironmentPresentation,
} from './environmentLayout';
import type { GardenChoice } from './rewardState';
import StorybookFoliage from './StorybookFoliage';
import StorybookTerrain from './StorybookTerrain';

export type StorybookGardenEnvironmentProps = Readonly<{
  grassTexture: Texture;
  rewardStage: number;
  starflowersVisible: boolean;
  pavilionImproved: boolean;
  seedVisible: boolean;
  destinationVisible: GardenChoice | null;
  reducedMotion: boolean;
}>;

function SkyClouds() {
  const cloudGroups = [
    { position: [-16, 12, -34] as [number, number, number], scale: 1.3 },
    { position: [21, 15, -42] as [number, number, number], scale: 1.8 },
    { position: [-30, 17, 5] as [number, number, number], scale: 1.5 },
  ];
  return (
    <group>
      {cloudGroups.map((cloud, index) => (
        <group key={index} position={cloud.position} scale={cloud.scale}>
          {[[-1.5, 0, 0], [0, 0.35, 0], [1.5, 0, 0], [0.7, -0.15, 0]].map((position, puff) => (
            <mesh key={puff} position={position as [number, number, number]} scale={[1.9, 0.75, 0.7]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color="#f6f3dc" transparent opacity={0.62} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function CentralPond({ reducedMotion }: { reducedMotion: boolean }) {
  const ripples = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ripples.current && !reducedMotion) ripples.current.rotation.z = clock.elapsedTime * 0.025;
  });

  return (
    <group>
      <mesh position={[0, -0.14, 0]} receiveShadow>
        <cylinderGeometry args={[6.45, 6.45, 0.36, 64]} />
        <meshStandardMaterial color="#827e69" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.82, 64]} />
        <meshPhysicalMaterial color="#4f9da7" roughness={0.12} metalness={0.04} clearcoat={0.82} clearcoatRoughness={0.16} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[5.82, 6.55, 64]} />
        <meshStandardMaterial color="#d8cfad" roughness={0.9} />
      </mesh>
      <group ref={ripples} position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[2.1, 3.55, 4.7].map((radius, index) => (
          <mesh key={radius}>
            <ringGeometry args={[radius, radius + 0.055, 64]} />
            <meshBasicMaterial color="#c7eeea" transparent opacity={0.46 - index * 0.1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const rockData: Array<{ position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number]; color: string }> = [
  { position: [-5.2, 2.7, -16.3], scale: [5.3, 4.2, 3.1], rotation: [0.2, 0.15, -0.08], color: '#777966' },
  { position: [0, 4.5, -17.1], scale: [5.8, 6.1, 3.3], rotation: [0.05, 0.35, 0.08], color: '#6f7461' },
  { position: [5.2, 2.8, -16.1], scale: [5.1, 4.4, 3.2], rotation: [-0.1, -0.2, 0.12], color: '#7e806c' },
  { position: [-2.7, 7.1, -17.5], scale: [3.4, 3.3, 2.4], rotation: [0.1, 0.4, -0.15], color: '#737764' },
  { position: [2.5, 7.4, -17.7], scale: [3.8, 3.1, 2.5], rotation: [-0.15, 0.1, 0.18], color: '#696f5d' },
];

function RockBackdrop() {
  return (
    <group>
      {rockData.map((rock, index) => (
        <mesh key={index} position={rock.position} scale={rock.scale} rotation={rock.rotation} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={rock.color} roughness={0.98} flatShading />
        </mesh>
      ))}
      {[-4.1, -1.2, 2.1, 4.4].map((x, index) => (
        <mesh key={x} position={[x, 7.3 + (index % 2) * 1.2, -15.9]} scale={[1.4, 0.32, 1]} rotation={[-0.15, index * 0.5, 0.1]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#55724e" roughness={1} flatShading />
        </mesh>
      ))}
      {[[-7.8, 0.55, -13.6], [-6.7, 0.38, -15], [7.2, 0.52, -14.4], [8.1, 0.32, -16]].map((position, index) => (
        <mesh key={`base-${index}`} position={position as [number, number, number]} scale={[1.5 - index * 0.1, 1.05, 1.15]} rotation={[0.2, index * 0.8, 0.1]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index % 2 ? '#85836c' : '#747663'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function SpringSanctuary({ reducedMotion }: { reducedMotion: boolean }) {
  const water = useRef<THREE.MeshPhysicalMaterial>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.opacity = reducedMotion ? 0.7 : 0.64 + Math.sin(clock.elapsedTime * 1.8) * 0.08;
  });
  return (
    <group position={[0, 0, -8.4]}>
      <mesh position={[0, 1.9, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 3.8, 0.8]} />
        <meshStandardMaterial color="#a8a38c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.95, 0.05]} castShadow>
        <boxGeometry args={[5.5, 0.45, 1.15]} />
        <meshStandardMaterial color="#d0c8aa" roughness={0.82} />
      </mesh>
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} position={[x, 2, 0.65]} castShadow>
          <cylinderGeometry args={[0.34, 0.42, 3.8, 12]} />
          <meshStandardMaterial color="#c5bea4" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.1, 0.72]}>
        <planeGeometry args={[2.55, 2.9]} />
        <meshPhysicalMaterial ref={water} color="#89cbd0" transparent opacity={0.7} roughness={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.42, 1.1]} castShadow>
        <cylinderGeometry args={[1.55, 1.8, 0.65, 32]} />
        <meshStandardMaterial color="#bcb59c" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.79, 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.36, 32]} />
        <meshPhysicalMaterial color="#6db2b7" roughness={0.1} clearcoat={0.7} />
      </mesh>
      <pointLight position={[0, 2.4, 1.2]} color="#b7eff0" intensity={3} distance={7} decay={2} />
    </group>
  );
}

function Pavilion({ improved, reducedMotion }: { improved: boolean; reducedMotion: boolean }) {
  const additions = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!additions.current) return;
    const target = improved ? 1 : 0.03;
    const next = reducedMotion ? target : THREE.MathUtils.damp(additions.current.scale.x, target, improved ? 4.2 : 7, delta);
    additions.current.scale.setScalar(next);
  });

  return (
    <group position={[-12.2, 0, -12.4]}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.1, 3.4, 1.8, 8]} />
        <meshStandardMaterial color="#b7ad91" roughness={0.94} />
      </mesh>
      {[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 3.4, z]} castShadow>
          <cylinderGeometry args={[0.19, 0.25, 5, 10]} />
          <meshStandardMaterial color="#88705e" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, 6.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.3, 1.5, 4]} />
        <meshStandardMaterial color="#796577" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.75, 0.5]} castShadow>
        <boxGeometry args={[3, 0.45, 1]} />
        <meshStandardMaterial color="#9a7859" roughness={0.9} />
      </mesh>
      <group ref={additions} scale={improved ? 1 : 0.03}>
        <mesh position={[0, 3.6, 0]}>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshStandardMaterial color="#f4cf78" emissive="#e7a957" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0, 2.25, -1.35]} castShadow>
          <boxGeometry args={[2.9, 2.05, 0.42]} />
          <meshStandardMaterial color="#8f6d52" roughness={0.92} />
        </mesh>
        {[-0.9, -0.45, 0, 0.45, 0.9].map((x, index) => (
          <mesh key={x} position={[x, 2.35 + (index % 2) * 0.08, -1.11]} rotation={[0, 0, (index - 2) * 0.035]} castShadow>
            <boxGeometry args={[0.25, 1.2 - (index % 3) * 0.08, 0.28]} />
            <meshStandardMaterial color={['#ad7658', '#6e8266', '#c59a58', '#7f6d91', '#b98263'][index]} roughness={0.86} />
          </mesh>
        ))}
        {[-1.7, 1.7].map((x) => (
          <group key={x} position={[x, 3.45, 0.25]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.24, 0.5, 8]} />
              <meshStandardMaterial color="#e6b763" emissive="#d99745" emissiveIntensity={1.1} />
            </mesh>
            <mesh position={[0, 0.48, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
              <meshStandardMaterial color="#655446" />
            </mesh>
          </group>
        ))}
      </group>
      <pointLight position={[0, 3.6, 0]} color="#ffd88a" intensity={improved ? 4 : 0} distance={8} decay={2} />
      {[0, 1, 2, 3].map((step) => (
        <mesh key={step} position={[0, 0.18 + step * 0.18, 4.2 - step * 0.52]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.35, 0.9]} />
          <meshStandardMaterial color="#c6bda1" roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

function FlowerPatch({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {[[-0.7, 0], [-0.2, 0.35], [0.35, -0.2], [0.75, 0.2], [0.1, -0.65]].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.025, 0.035, 0.46, 7]} />
            <meshStandardMaterial color="#4d774b" />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StarflowerPatch({ visible, reducedMotion }: { visible: boolean; reducedMotion: boolean }) {
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
        <FlowerPatch position={[0, 0, 0]} color="#e6c5ef" />
        <FlowerPatch position={[0.7, 0, 0.55]} color="#f3d58e" />
      </group>
      <pointLight position={[0, 1, 0]} color="#eed9ff" intensity={visible ? 1.8 : 0} distance={4.5} decay={2} />
    </group>
  );
}

function CuriousSeed({ visible, reducedMotion }: { visible: boolean; reducedMotion: boolean }) {
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
          <meshStandardMaterial color="#d2ad59" roughness={0.48} emissive="#9d7938" emissiveIntensity={0.18} flatShading />
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
      <pointLight position={[0, 1.1, 0]} color="#f0cf77" intensity={visible ? 2.2 : 0} distance={5} decay={2} />
    </group>
  );
}

function ChoiceDestination({ choice, reducedMotion }: { choice: GardenChoice | null; reducedMotion: boolean }) {
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
                    <meshStandardMaterial color="#f2c76e" emissive="#dc9842" emissiveIntensity={1.25} />
                  </mesh>
                </group>
              ))}
              <pointLight position={[0, 2.4, 0]} color="#ffd47e" intensity={3.2} distance={8} decay={2} />
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
                <meshStandardMaterial color="#d19b5e" roughness={0.82} />
              </mesh>
              {[-0.55, 0, 0.55].map((x, index) => (
                <mesh key={x} position={[x, 1.55 + index * 0.08, 1.18]} rotation={[0, 0, index * 0.3 - 0.3]}>
                  <boxGeometry args={[0.16, 0.7, 0.16]} />
                  <meshStandardMaterial color={index === 1 ? '#6a8065' : '#d0b064'} roughness={0.8} />
                </mesh>
              ))}
              <pointLight position={[0, 1.8, 1.4]} color="#f6b860" intensity={2.4} distance={6} decay={2} />
            </group>
          )}
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

  return (
    <>
      <color attach="background" args={['#addde5']} />
      <fog attach="fog" args={['#c9ddd0', 36, 78]} />
      <hemisphereLight args={['#d9f4ff', '#526d47', 1.65]} />
      <directionalLight position={[13, 24, 10]} intensity={2.45} color="#ffedb8" />
      <SkyClouds />

      <StorybookTerrain grassTexture={grassTexture} layout={layout} />

      <CentralPond reducedMotion={!presentation.rippleMotion} />
      <RockBackdrop />
      <SpringSanctuary reducedMotion={!presentation.moteMotion} />
      <Pavilion
        improved={presentation.pavilionGlow > 0.55}
        reducedMotion={!presentation.cloudMotion}
      />
      <StorybookFoliage layout={layout} />
      <StarflowerPatch
        visible={presentation.starflowerGlow > 0.2}
        reducedMotion={!presentation.moteMotion}
      />
      <CuriousSeed
        visible={presentation.seedGlow > 0.15}
        reducedMotion={!presentation.moteMotion}
      />
      <ChoiceDestination
        choice={presentation.destinationAccent}
        reducedMotion={!presentation.moteMotion}
      />
    </>
  );
}
