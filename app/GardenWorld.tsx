'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const GARDEN_HALF_SIZE = 20;
const PLAYER_MARGIN = 1;
const WALK_SPEED = 2;

const obstacles = [
  { x: 0, z: 0, radius: 6.7 },
  { x: 0, z: -15.2, radius: 6.8 },
  { x: -12.2, z: -12.4, radius: 3.2 },
  { x: 11.8, z: -9.2, radius: 1.15 },
  { x: 14.4, z: 5.8, radius: 1.15 },
  { x: -14.8, z: 4.5, radius: 1.15 },
];

type MovementInput = MutableRefObject<Set<string>>;

function FirstPersonControls({ movement }: { movement: MovementInput }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const dragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const nextPosition = useMemo(() => new THREE.Vector3(), []);

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
    const pressed = movement.current;
    const forwardAmount = Number(pressed.has('w') || pressed.has('arrowup')) - Number(pressed.has('s') || pressed.has('arrowdown'));
    const sideAmount = Number(pressed.has('d') || pressed.has('arrowright')) - Number(pressed.has('a') || pressed.has('arrowleft'));
    const length = Math.hypot(forwardAmount, sideAmount) || 1;
    const frameDistance = WALK_SPEED * Math.min(delta, 0.05);

    forward.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    right.set(Math.cos(yaw.current), 0, Math.sin(yaw.current));
    nextPosition.copy(camera.position);
    nextPosition.addScaledVector(forward, (forwardAmount / length) * frameDistance);
    nextPosition.addScaledVector(right, (sideAmount / length) * frameDistance);
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);

    obstacles.forEach((obstacle) => {
      const dx = nextPosition.x - obstacle.x;
      const dz = nextPosition.z - obstacle.z;
      const distance = Math.hypot(dx, dz);
      if (distance < obstacle.radius) {
        const safeDistance = distance || 1;
        nextPosition.x = obstacle.x + (dx / safeDistance) * obstacle.radius;
        nextPosition.z = obstacle.z + (dz / safeDistance) * obstacle.radius;
      }
    });

    camera.position.set(nextPosition.x, 1.7, nextPosition.z);
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
  });

  return null;
}

function HedgeBoundary({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#4f744e" roughness={1} />
    </mesh>
  );
}

function CentralPond() {
  const ripples = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ripples.current) ripples.current.rotation.z = clock.elapsedTime * 0.025;
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
    </group>
  );
}

function SpringSanctuary() {
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
        <meshPhysicalMaterial color="#89cbd0" transparent opacity={0.7} roughness={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.42, 1.1]} castShadow>
        <cylinderGeometry args={[1.55, 1.8, 0.65, 32]} />
        <meshStandardMaterial color="#bcb59c" roughness={0.88} />
      </mesh>
    </group>
  );
}

function Pavilion() {
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

function Pip() {
  const texture = useLoader(THREE.TextureLoader, '/pip-detailed-v2.png');
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <group position={[8.4, 0, 1.5]}>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#34483b" transparent opacity={0.24} />
      </mesh>
      <sprite position={[0, 0.57, 0]} scale={[0.82, 1.05, 1]}>
        <spriteMaterial map={texture} transparent alphaTest={0.08} depthWrite={false} />
      </sprite>
    </group>
  );
}

function GardenWorldScene({ movement }: { movement: MovementInput }) {
  return (
    <>
      <color attach="background" args={['#addde5']} />
      <fog attach="fog" args={['#c9ddd0', 36, 78]} />
      <hemisphereLight args={['#d9f4ff', '#526d47', 1.65]} />
      <directionalLight position={[13, 24, 10]} intensity={2.45} color="#ffedb8" castShadow shadow-mapSize={[1536, 1536]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} />

      <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#789963" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#76a160" roughness={1} />
      </mesh>

      <HedgeBoundary position={[0, 1, -20]} size={[40, 2, 1.15]} />
      <HedgeBoundary position={[0, 1, 20]} size={[40, 2, 1.15]} />
      <HedgeBoundary position={[-20, 1, 0]} size={[1.15, 2, 40]} />
      <HedgeBoundary position={[20, 1, 0]} size={[1.15, 2, 40]} />

      <CentralPond />
      <RockBackdrop />
      <SpringSanctuary />
      <Pavilion />
      <GardenTree position={[11.8, 0, -9.2]} scale={1.05} />
      <GardenTree position={[14.4, 0, 5.8]} scale={0.88} color="#49744c" />
      <GardenTree position={[-14.8, 0, 4.5]} scale={0.94} color="#5f8558" />
      <FlowerPatch position={[8.2, 0, 6.6]} color="#e6c5ef" />
      <FlowerPatch position={[-8.5, 0, 7.4]} color="#f1c77c" />
      <FlowerPatch position={[8.8, 0, -5.9]} color="#d3dff7" />
      <Pip />

      <FirstPersonControls movement={movement} />
    </>
  );
}

export default function GardenWorld() {
  const movement = useRef(new Set<string>());
  const startMoving = (key: string) => movement.current.add(key);
  const stopMoving = (key: string) => movement.current.delete(key);

  return (
    <div className="world-wrap">
      <Canvas shadows camera={{ fov: 68, near: 0.1, far: 120 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <GardenWorldScene movement={movement} />
      </Canvas>
      <div className="world-reticle" aria-hidden="true" />
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
