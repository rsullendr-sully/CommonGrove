'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Image from 'next/image';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import PipCharacter from './garden/PipCharacter';
import { EMPLOYEE_WALK_SPEED, stepLocomotion, type LocomotionConfig, type LocomotionState } from './garden/locomotion';
import { getPipPose, type PipPose } from './garden/pipPose';
import { type GardenChoice } from './garden/rewardState';

const GARDEN_HALF_SIZE = 20;
const PLAYER_MARGIN = 1;

const obstacles = [
  { x: 0, z: 0, radius: 6.7 },
  { x: 0, z: -15.2, radius: 6.8 },
  { x: -12.2, z: -12.4, radius: 3.2 },
  { x: 11.8, z: -9.2, radius: 1.15 },
  { x: 14.4, z: 5.8, radius: 1.15 },
  { x: -14.8, z: 4.5, radius: 1.15 },
];

type MovementInput = MutableRefObject<Set<string>>;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function FrameCadence() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let cadence: number | null = null;
    const updateCadence = () => {
      if (cadence !== null) window.clearInterval(cadence);
      cadence = null;
      if (document.hidden) return;
      invalidate();
      cadence = window.setInterval(invalidate, 34);
    };
    updateCadence();
    document.addEventListener('visibilitychange', updateCadence);
    return () => {
      document.removeEventListener('visibilitychange', updateCadence);
      if (cadence !== null) window.clearInterval(cadence);
    };
  }, [invalidate]);
  return null;
}

function useGrassTexture() {
  const texture = useMemo(() => {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    let seed = 731;
    for (let index = 0; index < size * size; index += 1) {
      seed = (seed * 16807) % 2147483647;
      const variation = (seed % 34) - 17;
      data[index * 4] = 105 + variation;
      data[index * 4 + 1] = 151 + variation;
      data[index * 4 + 2] = 84 + Math.round(variation * 0.55);
      data[index * 4 + 3] = 255;
    }
    const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    result.wrapS = THREE.RepeatWrapping;
    result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(22, 22);
    result.colorSpace = THREE.SRGBColorSpace;
    result.magFilter = THREE.NearestFilter;
    result.needsUpdate = true;
    return result;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function FirstPersonControls({ movement }: { movement: MovementInput }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const dragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const nextPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(0, 1.7, 17);

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, select, textarea, button, summary')) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        event.preventDefault();
        movement.current.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => movement.current.delete(event.key.toLowerCase());
    const onPointerDown = (event: PointerEvent) => {
      dragging.current = true;
      previousPointer.current = { x: event.clientX, y: event.clientY };
      gl.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= (event.clientX - previousPointer.current.x) * 0.004;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - (event.clientY - previousPointer.current.y) * 0.003,
        -0.62,
        0.5,
      );
      previousPointer.current = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging.current = false;
      if (gl.domElement.hasPointerCapture(event.pointerId)) gl.domElement.releasePointerCapture(event.pointerId);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    gl.domElement.addEventListener('pointerdown', onPointerDown);
    gl.domElement.addEventListener('pointermove', onPointerMove);
    gl.domElement.addEventListener('pointerup', onPointerUp);
    gl.domElement.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      gl.domElement.removeEventListener('pointerdown', onPointerDown);
      gl.domElement.removeEventListener('pointermove', onPointerMove);
      gl.domElement.removeEventListener('pointerup', onPointerUp);
      gl.domElement.removeEventListener('pointercancel', onPointerUp);
    };
  }, [camera, gl, movement]);

  useFrame((_, delta) => {
    const forwardVector = forward.current;
    const rightVector = right.current;
    const candidatePosition = nextPosition.current;
    const pressed = movement.current;
    const forwardAmount = Number(pressed.has('w') || pressed.has('arrowup')) - Number(pressed.has('s') || pressed.has('arrowdown'));
    const sideAmount = Number(pressed.has('d') || pressed.has('arrowright')) - Number(pressed.has('a') || pressed.has('arrowleft'));
    const length = Math.hypot(forwardAmount, sideAmount) || 1;
    const frameDistance = EMPLOYEE_WALK_SPEED * Math.min(delta, 0.05);

    forwardVector.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    rightVector.set(Math.cos(yaw.current), 0, Math.sin(yaw.current));
    candidatePosition.copy(camera.position);
    candidatePosition.addScaledVector(forwardVector, (forwardAmount / length) * frameDistance);
    candidatePosition.addScaledVector(rightVector, (sideAmount / length) * frameDistance);
    candidatePosition.x = THREE.MathUtils.clamp(candidatePosition.x, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);
    candidatePosition.z = THREE.MathUtils.clamp(candidatePosition.z, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);

    obstacles.forEach((obstacle) => {
      const dx = candidatePosition.x - obstacle.x;
      const dz = candidatePosition.z - obstacle.z;
      const distance = Math.hypot(dx, dz);
      if (distance < obstacle.radius) {
        const safeDistance = distance || 1;
        candidatePosition.x = obstacle.x + (dx / safeDistance) * obstacle.radius;
        candidatePosition.z = obstacle.z + (dz / safeDistance) * obstacle.radius;
      }
    });

    camera.position.set(candidatePosition.x, 1.7, candidatePosition.z);
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
  });

  return null;
}

function HedgeBoundary({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#4f744e" roughness={1} />
    </mesh>
  );
}

function BoundaryPlanting() {
  const shrubs = useMemo(() => {
    const items: Array<{ position: [number, number, number]; scale: [number, number, number]; color: string }> = [];
    for (let value = -18; value <= 18; value += 3) {
      const variation = 0.82 + ((value + 18) % 5) * 0.055;
      items.push({ position: [value, 1.35, -19.1], scale: [1.65, variation, 1.25], color: value % 2 ? '#527650' : '#5f8257' });
      items.push({ position: [value, 1.2, 19.1], scale: [1.55, variation * 0.9, 1.15], color: value % 2 ? '#5a7d52' : '#4e714c' });
      items.push({ position: [-19.1, 1.25, value], scale: [1.2, variation, 1.55], color: value % 2 ? '#527650' : '#62845a' });
      items.push({ position: [19.1, 1.25, value], scale: [1.2, variation * 0.95, 1.55], color: value % 2 ? '#4e714c' : '#597c52' });
    }
    return items;
  }, []);

  return (
    <group>
      {shrubs.map((shrub, index) => (
        <mesh key={index} position={shrub.position} scale={shrub.scale} receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={shrub.color} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function GardenPaths() {
  const steppingStones: Array<[number, number, number, number]> = [
    [0, 0.035, 14.5, -0.04], [-0.2, 0.04, 12.4, 0.08], [0.25, 0.045, 10.4, -0.1],
    [-0.3, 0.04, 8.45, 0.06], [-7.1, 0.04, -5.7, -0.35], [-8.4, 0.045, -7, -0.55],
    [-9.5, 0.05, -8.3, -0.68], [-10.5, 0.055, -9.7, -0.75],
  ];
  return (
    <group>
      {steppingStones.map(([x, y, z, rotation], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[0, rotation, 0]} scale={[1.3, 0.11, 0.78]} receiveShadow>
          <cylinderGeometry args={[0.82, 0.9, 0.28, 10]} />
          <meshStandardMaterial color={index % 2 ? '#c9bea0' : '#d8cdac'} roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

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

function GardenTree({ position, scale = 1, color = '#557c52' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.42, 4.2, 10]} />
        <meshStandardMaterial color="#806149" roughness={1} />
      </mesh>
      {[[0, 4.7, 0], [-0.8, 4.3, 0.1], [0.78, 4.35, -0.1], [0.05, 4.1, 0.7]].map((leaf, index) => (
        <mesh key={index} position={leaf as [number, number, number]} scale={[1.25, 1.05, 1.1]} castShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={index % 2 ? '#64885a' : color} roughness={1} flatShading />
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

const pipWaypoints: Array<[number, number]> = [
  [8.4, 1.5], [8.7, -3.8], [6.8, -7.2], [1.8, -8], [-4.8, -8],
  [-8.1, -5.2], [-8.2, 2.4], [-6.3, 7.1], [0.4, 8], [6.4, 7],
];

const pipMotionConfig: LocomotionConfig = {
  maxSpeed: 1.2,
  acceleration: 3,
  deceleration: 4,
  turnSpeed: Math.PI * 2,
  arrivalRadius: 0.16,
  brakingRadius: 0.9,
};

const pipRewardMotionConfig: LocomotionConfig = {
  ...pipMotionConfig,
  maxSpeed: 1.65,
};

function Pip({ onMessage, rewardStage, gardenChoice, reducedMotion }: { onMessage: (message: string | null) => void; rewardStage: number; gardenChoice: GardenChoice | null; reducedMotion: boolean }) {
  const pip = useRef<THREE.Group>(null);
  const pipMotion = useRef<LocomotionState>({
    position: new THREE.Vector3(8.4, 0, 1.5),
    facing: Math.PI,
    speed: 0,
    distanceTravelled: 0,
    moving: false,
  });
  const [pose, setPose] = useState<PipPose>(() => getPipPose({
    speed: 0,
    distanceTravelled: 0,
    attentive: false,
    reducedMotion,
  }));
  const waypointIndex = useRef(0);
  const pauseUntil = useRef(0);
  const nearby = useRef(false);
  const greeted = useRef(false);
  const target = useMemo(() => new THREE.Vector3(), []);
  const rewardMission = useRef<0 | 1 | 2 | 3>(0);
  const observedRewardStage = useRef(0);
  const reactionMessageUntil = useRef(0);
  const observedChoice = useRef<GardenChoice | null>(null);
  const choiceMission = useRef<GardenChoice | null>(null);

  useEffect(() => {
    if (rewardStage > observedRewardStage.current) {
      observedRewardStage.current = rewardStage;
      rewardMission.current = rewardStage as 1 | 2 | 3;
      onMessage(rewardStage === 3
        ? 'A tiny golden light appears by the unopened path. Pip hurries to see.'
        : rewardStage === 2
          ? 'A warm chime carries from the reading pavilion. Pip turns toward it.'
          : 'One ear lifts. Pip noticed something change near the pond.');
    }
  }, [rewardStage, onMessage]);

  useEffect(() => {
    if (gardenChoice && gardenChoice !== observedChoice.current) {
      observedChoice.current = gardenChoice;
      choiceMission.current = gardenChoice;
      onMessage(gardenChoice === 'orchard'
        ? 'Soft lanterns flicker to life. Pip trots toward the new orchard path.'
        : 'A cheerful little tap echoes across the lawn. Pip heads for the workshop path.');
    }
  }, [gardenChoice, onMessage]);

  useFrame(({ clock, camera }, delta) => {
    if (pip.current) {
      let hasMovementTarget = false;
      const distanceToVisitor = Math.hypot(
        pip.current.position.x - camera.position.x,
        pip.current.position.z - camera.position.z,
      );
      const isNearby = distanceToVisitor < 3.15;

      if (isNearby && !nearby.current) {
        nearby.current = true;
        if (!greeted.current) {
          greeted.current = true;
          onMessage('Oh! You’re here. I saved the quiet spot by the spring for you.');
        } else {
          onMessage('Pip pauses, perks up one ear, and listens.');
        }
      } else if (distanceToVisitor > 4.1 && nearby.current) {
        nearby.current = false;
        onMessage(null);
        pauseUntil.current = clock.elapsedTime + 1.5;
      }

      if (reactionMessageUntil.current && clock.elapsedTime > reactionMessageUntil.current && !isNearby) {
        reactionMessageUntil.current = 0;
        onMessage(null);
      }

      if (!isNearby && rewardMission.current) {
        const activeMission = rewardMission.current;
        target.set(activeMission === 3 ? -8.5 : activeMission === 2 ? -8.65 : 8.2, 0, activeMission === 3 ? 7.4 : activeMission === 2 ? -8.1 : 6.6);
        const distanceToReward = pip.current.position.distanceTo(target);
        if (distanceToReward < 0.22) {
          rewardMission.current = 0;
          pauseUntil.current = clock.elapsedTime + 6;
          reactionMessageUntil.current = clock.elapsedTime + 6;
          onMessage(activeMission === 3
            ? 'A curious seed! Pip leaves it safely waiting for your choice.'
            : activeMission === 2
              ? 'The nook is ready. Pip settles beside the new books for a moment.'
              : 'It bloomed! Something kind reached the garden.');
        } else {
          hasMovementTarget = true;
        }
      } else if (!isNearby && choiceMission.current) {
        const activeChoice = choiceMission.current;
        target.set(-10.6, 0, 9.2);
        const distanceToChoice = pip.current.position.distanceTo(target);
        if (distanceToChoice < 0.22) {
          choiceMission.current = null;
          pauseUntil.current = clock.elapsedTime + 6;
          reactionMessageUntil.current = clock.elapsedTime + 6;
          onMessage(activeChoice === 'orchard'
            ? 'The lantern saplings are taking root. Pip curls up in their warm glow.'
            : 'The workshop foundation is ready. Pip listens for the next useful idea.');
        } else {
          hasMovementTarget = true;
        }
      } else if (!isNearby && clock.elapsedTime >= pauseUntil.current) {
        const [targetX, targetZ] = pipWaypoints[waypointIndex.current];
        target.set(targetX, 0, targetZ);
        const distanceToTarget = pip.current.position.distanceTo(target);
        if (distanceToTarget < 0.16) {
          waypointIndex.current = (waypointIndex.current + 1) % pipWaypoints.length;
          pauseUntil.current = clock.elapsedTime + 2.5 + (waypointIndex.current % 3);
        } else {
          hasMovementTarget = true;
        }
      }

      if (hasMovementTarget) {
        pipMotion.current = stepLocomotion(
          pipMotion.current,
          target,
          delta,
          rewardMission.current ? pipRewardMotionConfig : pipMotionConfig,
        );
        pip.current.position.copy(pipMotion.current.position);
        pip.current.rotation.y = pipMotion.current.facing;
      } else if (pipMotion.current.moving || pipMotion.current.speed > 0) {
        pipMotion.current = { ...pipMotion.current, speed: 0, moving: false };
      }

      const currentLocomotion = pipMotion.current;
      setPose(getPipPose({
        speed: currentLocomotion.moving ? currentLocomotion.speed : 0,
        distanceTravelled: currentLocomotion.distanceTravelled,
        attentive: isNearby,
        reducedMotion,
      }));
    }
  });

  return (
    <group ref={pip} position={[8.4, 0, 1.5]} rotation={[0, Math.PI, 0]}>
      <mesh name="blobShadow" position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.48, 0.31, 1]}>
        <circleGeometry args={[0.9, 24]} />
        <meshBasicMaterial color="#34483b" transparent opacity={0.24} />
      </mesh>
      <PipCharacter pose={pose} />
    </group>
  );
}

function GardenWorldScene({ movement, onPipMessage, rewardStage, starflowersVisible, pavilionImproved, seedVisible, gardenChoice, reducedMotion }: { movement: MovementInput; onPipMessage: (message: string | null) => void; rewardStage: number; starflowersVisible: boolean; pavilionImproved: boolean; seedVisible: boolean; gardenChoice: GardenChoice | null; reducedMotion: boolean }) {
  const grassTexture = useGrassTexture();
  return (
    <>
      <FrameCadence />
      <color attach="background" args={['#addde5']} />
      <fog attach="fog" args={['#c9ddd0', 36, 78]} />
      <hemisphereLight args={['#d9f4ff', '#526d47', 1.65]} />
      <directionalLight position={[13, 24, 10]} intensity={2.45} color="#ffedb8" />
      <SkyClouds />

      <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#789963" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={grassTexture} color="#ffffff" roughness={1} />
      </mesh>

      <HedgeBoundary position={[0, 1, -20]} size={[40, 2, 1.15]} />
      <HedgeBoundary position={[0, 1, 20]} size={[40, 2, 1.15]} />
      <HedgeBoundary position={[-20, 1, 0]} size={[1.15, 2, 40]} />
      <HedgeBoundary position={[20, 1, 0]} size={[1.15, 2, 40]} />
      <BoundaryPlanting />
      <GardenPaths />

      <CentralPond reducedMotion={reducedMotion} />
      <RockBackdrop />
      <SpringSanctuary reducedMotion={reducedMotion} />
      <Pavilion improved={pavilionImproved} reducedMotion={reducedMotion} />
      <GardenTree position={[11.8, 0, -9.2]} scale={1.05} />
      <GardenTree position={[14.4, 0, 5.8]} scale={0.88} color="#49744c" />
      <GardenTree position={[-14.8, 0, 4.5]} scale={0.94} color="#5f8558" />
      <StarflowerPatch visible={starflowersVisible} reducedMotion={reducedMotion} />
      <CuriousSeed visible={seedVisible} reducedMotion={reducedMotion} />
      <ChoiceDestination choice={gardenChoice} reducedMotion={reducedMotion} />
      <FlowerPatch position={[8.8, 0, -5.9]} color="#d3dff7" />
      <Pip onMessage={onPipMessage} rewardStage={rewardStage} gardenChoice={gardenChoice} reducedMotion={reducedMotion} />

      <FirstPersonControls movement={movement} />
    </>
  );
}

export default function GardenWorld({ rewardStage, starflowersVisible, pavilionImproved, seedVisible, gardenChoice }: { rewardStage: number; starflowersVisible: boolean; pavilionImproved: boolean; seedVisible: boolean; gardenChoice: GardenChoice | null }) {
  const movement = useRef(new Set<string>());
  const [pipMessage, setPipMessage] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const startMoving = (key: string) => movement.current.add(key);
  const stopMoving = (key: string) => movement.current.delete(key);

  return (
    <div className="world-wrap">
      <Canvas frameloop="demand" shadows={false} camera={{ fov: 68, near: 0.1, far: 120 }} dpr={0.7} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <GardenWorldScene
          movement={movement}
          onPipMessage={setPipMessage}
          rewardStage={rewardStage}
          starflowersVisible={starflowersVisible}
          pavilionImproved={pavilionImproved}
          seedVisible={seedVisible}
          gardenChoice={gardenChoice}
          reducedMotion={reducedMotion}
        />
      </Canvas>
      <div className="world-reticle" aria-hidden="true" />
      <div className={`pip-presence ${pipMessage ? 'visible' : ''}`} role="status" aria-live="polite">
        <Image src="/pip-detailed-v2.png" width={43} height={43} alt="" aria-hidden="true" />
        <span><strong>Pip</strong>{pipMessage}</span>
      </div>
      <div className="world-instructions">
        <strong>Walk the grove</strong>
        <span>WASD or arrow keys · drag to look</span>
      </div>
      <div className="world-pad" aria-label="First-person movement controls">
        {[
          ['arrowup', '↑', 'Walk forward'],
          ['arrowleft', '←', 'Step left'],
          ['arrowdown', '↓', 'Step backward'],
          ['arrowright', '→', 'Step right'],
        ].map(([key, label, ariaLabel]) => (
          <button
            key={key}
            type="button"
            className={`world-${key}`}
            aria-label={ariaLabel}
            onPointerDown={() => startMoving(key)}
            onPointerUp={() => stopMoving(key)}
            onPointerLeave={() => stopMoving(key)}
            onPointerCancel={() => stopMoving(key)}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}
