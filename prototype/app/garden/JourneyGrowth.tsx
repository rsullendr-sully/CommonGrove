'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Visit } from './journey';
import type { GardenChoice } from './rewardState';
import { getJourneyGrowth } from './journeyLayout';
import { PAVILION_CENTER } from './pavilionLayout';

function WindSculpture({ position, scale, index, reducedMotion, mature }: { position: [number, number, number]; scale: number; index: number; reducedMotion: boolean; mature: boolean }) {
  const wheel = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (wheel.current && mature && !reducedMotion) wheel.current.rotation.z += Math.min(delta, 0.05) * (0.28 + index * 0.1);
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.065, 0.09, 2.4, 8]} /><meshStandardMaterial color="#876243" roughness={.9} /></mesh>
      <group ref={wheel} position={[0, 2.4, 0]} rotation={[0, 0, index * .3]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.15, .15, .2, 12]} /><meshStandardMaterial color="#d7b271" metalness={.2} roughness={.65} /></mesh>
        {[0, 1, 2, 3].map((blade) => (
          <group key={blade} rotation={[0, 0, blade * Math.PI / 2]}>
            <mesh position={[0, .5, 0]} rotation={[0, .2, .18]} castShadow><boxGeometry args={[.28, .78, .065]} /><meshStandardMaterial color={blade % 2 ? '#88b8ac' : '#e0b66d'} roughness={.85} /></mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export default function JourneyGrowth({ visit, choice, reducedMotion }: { visit: Visit; choice: GardenChoice | null; reducedMotion: boolean }) {
  const growth = getJourneyGrowth(visit, choice);
  if (visit === 1) return null;
  return (
    <>
      <group position={[PAVILION_CENTER.x, 0, PAVILION_CENTER.z]}>
        {Array.from({ length: visit - 1 }, (_, index) => (
          <mesh key={`cushion-${index}`} position={[-1.9, .68, -.5 + index * .58]} scale={[.29, .13, .24]} castShadow>
            <sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={index % 2 ? '#b98768' : '#79998e'} roughness={1} />
          </mesh>
        ))}
        {Array.from({ length: visit }, (_, index) => (
          <mesh key={`book-${index}`} position={[1.88, .68 + index * .085, .25]} rotation={[0, index * .12, 0]} castShadow>
            <boxGeometry args={[.48, .08, .58]} /><meshStandardMaterial color={['#af7961', '#698b83', '#d1af77', '#8f7c99'][index]} roughness={.95} />
          </mesh>
        ))}
        {visit >= 3 && [-1, 0, 1].map((x) => (
          <group key={x} position={[x * 1.2, 3.8, 1.95]}>
            <mesh><cylinderGeometry args={[.025, .025, .6, 6]} /><meshStandardMaterial color="#7b6544" /></mesh>
            <mesh position={[0, -.42, 0]}><sphereGeometry args={[.17, 12, 8]} /><meshStandardMaterial color="#f0cf8b" emissive="#dcae58" emissiveIntensity={.45} roughness={.6} /></mesh>
          </group>
        ))}
      </group>
      {choice === 'workshop' && (
        <group position={[-13, 0, 11]}>
          {([[-.95, 1.12, 1.82], [1.7, .25, 1.3], [0, .28, -1.82]] as [number, number, number][]).slice(0, growth.inventionCount).map((position, index) => (
            <WindSculpture key={index} position={position} scale={[.45, .6, .65][index]} index={index} reducedMotion={reducedMotion} mature={visit >= 3} />
          ))}
          {visit === 4 && (
            <group position={[0, 1.98, 1.34]}>
              <mesh><boxGeometry args={[3.2, .065, .06]} /><meshStandardMaterial color="#8b6b46" /></mesh>
              {[-1.2, -.6, 0, .6, 1.2].map((x, index) => (
                <mesh key={x} position={[x, -.22, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[.18, .38, 3]} /><meshStandardMaterial color={index % 2 ? '#e0b66d' : '#88b8ac'} roughness={1} /></mesh>
              ))}
            </group>
          )}
        </group>
      )}
    </>
  );
}
