'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MutableRefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';

const GARDEN_HALF_SIZE = 20;
const PLAYER_MARGIN = 1;
const WALK_SPEED = 2;
const POND_COLLISION_RADIUS = 6.7;

type MovementInput = MutableRefObject<Set<string>>;

function FirstPersonControls({ movement }: { movement: MovementInput }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const dragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    camera.position.set(0, 1.7, 17);

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, select, textarea, button')) return;
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
      pitch.current = Math.max(-0.65, Math.min(0.55, pitch.current - (event.clientY - previousPointer.current.y) * 0.003));
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
    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, Math.sin(yaw.current));

    const nextPosition = camera.position.clone();
    nextPosition.addScaledVector(forward, (forwardAmount / length) * frameDistance);
    nextPosition.addScaledVector(right, (sideAmount / length) * frameDistance);
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);

    const pondDistance = Math.hypot(nextPosition.x, nextPosition.z);
    if (pondDistance < POND_COLLISION_RADIUS) {
      const safeDistance = pondDistance || 1;
      nextPosition.x = (nextPosition.x / safeDistance) * POND_COLLISION_RADIUS;
      nextPosition.z = (nextPosition.z / safeDistance) * POND_COLLISION_RADIUS;
    }

    camera.position.x = nextPosition.x;
    camera.position.z = nextPosition.z;
    camera.position.y = 1.7;
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
  });

  return null;
}

function Boundary({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#6f8064" roughness={0.95} />
    </mesh>
  );
}

function CentralPond() {
  return (
    <group>
      <mesh position={[0, -0.13, 0]} receiveShadow>
        <cylinderGeometry args={[6.35, 6.35, 0.34, 64]} />
        <meshStandardMaterial color="#8a8b72" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.82, 64]} />
        <meshPhysicalMaterial color="#559fa4" roughness={0.18} metalness={0.05} clearcoat={0.72} clearcoatRoughness={0.22} />
      </mesh>
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[5.82, 6.55, 64]} />
        <meshStandardMaterial color="#d0c7a5" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.087, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.16, 64]} />
        <meshBasicMaterial color="#b8e1dc" transparent opacity={0.52} />
      </mesh>
      <mesh position={[0, 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.55, 3.61, 64]} />
        <meshBasicMaterial color="#b8e1dc" transparent opacity={0.34} />
      </mesh>
    </group>
  );
}

function GardenShell({ movement }: { movement: MovementInput }) {
  return (
    <>
      <color attach="background" args={['#b9dde0']} />
      <fog attach="fog" args={['#c8ded4', 28, 62]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[12, 22, 8]} intensity={2.2} color="#fff0c2" castShadow shadow-mapSize={[1024, 1024]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#71985f" roughness={1} />
      </mesh>

      <Boundary position={[0, 1.15, -20]} size={[40, 2.3, 1.2]} />
      <Boundary position={[0, 1.15, 20]} size={[40, 2.3, 1.2]} />
      <Boundary position={[-20, 1.15, 0]} size={[1.2, 2.3, 40]} />
      <Boundary position={[20, 1.15, 0]} size={[1.2, 2.3, 40]} />

      <CentralPond />

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
      <Canvas shadows camera={{ fov: 70, near: 0.1, far: 100 }} dpr={[1, 1.5]}>
        <GardenShell movement={movement} />
      </Canvas>
      <div className="world-reticle" aria-hidden="true" />
      <div className="world-instructions">
        <strong>Walk the garden</strong>
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
