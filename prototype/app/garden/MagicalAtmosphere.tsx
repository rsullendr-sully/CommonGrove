'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type {
  EnvironmentPresentation,
  StorybookEnvironmentLayout,
} from './environmentLayout';
import { getAtmosphereMotionFrame } from './environmentMotion';
import { GARDEN_RENDER_QUALITY } from './gardenSurface';
import SanctuarySky from './SanctuarySky';

export type MagicalAtmosphereProps = Readonly<{
  layout: StorybookEnvironmentLayout;
  presentation: EnvironmentPresentation;
}>;

const MAX_MOTE_COUNT = 96;
const CLOUD_PUFF_GEOMETRY = new THREE.SphereGeometry(1, 24, 16);
const CLOUD_PUFF_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#fff0db', roughness: 1,
  emissive: '#d2b9a1', emissiveIntensity: .15,
  fog: false,
});

const CLOUD_LAYERS = [
  { position: [-23, 18, -36], scale: 2.6 },
  { position: [24, 24, -44], scale: 3.2 },
  { position: [-34, 25, 5], scale: 2.8 },
] as const;

const CLOUD_PUFFS = [
  { position: [-1.8, 0, 0], scale: [1.7, 1.05, 1.3] },
  { position: [-.65, .7, -.15], scale: [1.55, 1.8, 1.3] },
  { position: [.9, 0, .1], scale: [2.1, .85, 1.4] },
  { position: [.35, .7, -.25], scale: [1.4, 1.3, 1.1] },
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
      <SanctuarySky />
      <color attach="background" args={['#91cfe1']} />
      <fog attach="fog" args={['#d1e3d6', 45, 110]} />
      <hemisphereLight args={['#f4f8ed', '#7c8760', 1.65]} />
      <directionalLight
        position={[15, 25, 11]}
        color="#ffe7bd"
        intensity={2.1}
        castShadow
        shadow-mapSize-width={GARDEN_RENDER_QUALITY.shadowMapSize}
        shadow-mapSize-height={GARDEN_RENDER_QUALITY.shadowMapSize}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0002}
      />
      <directionalLight
        position={[-14, 10, -8]}
        color="#b7dcd7"
        intensity={0.5}
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
