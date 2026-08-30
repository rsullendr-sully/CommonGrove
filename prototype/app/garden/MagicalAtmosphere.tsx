'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type {
  EnvironmentPresentation,
  StorybookEnvironmentLayout,
} from './environmentLayout';
import { getAtmosphereMotionFrame } from './environmentMotion';

export type MagicalAtmosphereProps = Readonly<{
  layout: StorybookEnvironmentLayout;
  presentation: EnvironmentPresentation;
}>;

const MAX_MOTE_COUNT = 96;
const CLOUD_PUFF_GEOMETRY = new THREE.SphereGeometry(1, 12, 8);
const CLOUD_PUFF_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#f6f3dc',
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  fog: false,
});

const CLOUD_LAYERS = [
  { position: [-16, 12, -34], scale: 1.3 },
  { position: [21, 15, -42], scale: 1.8 },
  { position: [-30, 17, 5], scale: 1.5 },
] as const;

const CLOUD_PUFFS = [
  { position: [-1.5, 0, 0], scale: [1.9, 0.75, 0.7] },
  { position: [0, 0.35, 0], scale: [2.15, 0.9, 0.78] },
  { position: [1.5, 0, 0], scale: [1.9, 0.75, 0.7] },
  { position: [0.7, -0.15, 0], scale: [1.75, 0.68, 0.65] },
] as const;

export default function MagicalAtmosphere({
  layout,
  presentation,
}: MagicalAtmosphereProps) {
  const clouds = useRef<THREE.Group>(null);
  const motes = useRef<THREE.Points>(null);
  const moteMaterial = useRef<THREE.PointsMaterial>(null);
  const motionFrame = useRef({
    moteDriftX: 0,
    moteDriftY: 0,
    cloudDriftX: 0,
    moteOpacity: 1,
  });
  const moteGeometry = useMemo(() => {
    const sourceMotes = layout.motes.slice(0, MAX_MOTE_COUNT);
    const positions = new Float32Array(sourceMotes.length * 3);
    for (let index = 0; index < sourceMotes.length; index += 1) {
      const [x, y, z] = sourceMotes[index].position;
      const offset = index * 3;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }, [layout.motes]);

  useEffect(() => () => moteGeometry.dispose(), [moteGeometry]);

  useFrame(({ clock }) => {
    const frame = getAtmosphereMotionFrame(
      clock.elapsedTime,
      presentation.moteMotion || presentation.cloudMotion,
      motionFrame.current,
    );
    if (motes.current) {
      motes.current.position.x = presentation.moteMotion ? frame.moteDriftX : 0;
      motes.current.position.y = presentation.moteMotion ? frame.moteDriftY : 0;
    }
    if (clouds.current) {
      clouds.current.position.x = presentation.cloudMotion ? frame.cloudDriftX : 0;
    }
    if (moteMaterial.current) {
      moteMaterial.current.opacity = presentation.moteMotion ? frame.moteOpacity : 1;
    }
  });

  return (
    <>
      <color attach="background" args={['#b9e2df']} />
      <fog attach="fog" args={['#c6ddd1', 34, 72]} />
      <hemisphereLight args={['#e5f6ef', '#4d6646', 1.45]} />
      <directionalLight
        position={[13, 24, 10]}
        color="#ffe4a8"
        intensity={2.3}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0002}
      />

      <group ref={clouds}>
        {CLOUD_LAYERS.map((cloud, layerIndex) => (
          <group
            key={layerIndex}
            position={[...cloud.position]}
            scale={cloud.scale}
          >
            {CLOUD_PUFFS.map((puff, puffIndex) => (
              <mesh
                key={puffIndex}
                geometry={CLOUD_PUFF_GEOMETRY}
                material={CLOUD_PUFF_MATERIAL}
                position={[...puff.position]}
                scale={[...puff.scale]}
                dispose={null}
              />
            ))}
          </group>
        ))}
      </group>

      <points ref={motes} geometry={moteGeometry}>
        <pointsMaterial
          ref={moteMaterial}
          color="#fff2b0"
          size={0.08}
          sizeAttenuation
          transparent
          opacity={presentation.moteMotion ? 0.82 : 1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
