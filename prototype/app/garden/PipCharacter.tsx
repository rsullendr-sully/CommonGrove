'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PipPose } from './pipPose';

const CLAY = '#f3e4c2';
const FEATURES = '#3c2b20';
const FRECKLES = '#c99558';

export default function PipCharacter({ pose }: { pose: PipPose }): React.JSX.Element {
  const torso = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftFoot = useRef<THREE.Mesh>(null);
  const rightFoot = useRef<THREE.Mesh>(null);
  const listeningEar = useRef<THREE.Group>(null);
  const smile = useMemo(
    () => new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.075, 0.025, 0),
      new THREE.Vector3(0.005, -0.04, 0),
      new THREE.Vector3(0.095, -0.006, 0),
    ),
    [],
  );

  return (
    <group>
      <group
        ref={torso}
        position={[0, 0.48 + pose.bodyLift, 0]}
        rotation={[pose.bodyLean, 0, 0]}
      >
        <mesh position={[0, -0.01, 0]} scale={[0.34, 0.36, 0.29]} castShadow>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color={CLAY} roughness={0.96} />
        </mesh>
        <group position={[0, -pose.headLower, 0]} rotation={[0, 0, pose.headTilt]}>
          <mesh position={[0, 0.22, 0]} scale={[0.31, 0.3, 0.27]} castShadow>
            <sphereGeometry args={[1, 24, 18]} />
            <meshStandardMaterial color={CLAY} roughness={0.96} />
          </mesh>

          <group
            ref={listeningEar}
            position={[-0.19, 0.43 + pose.listeningEarLift, -0.015]}
            rotation={[0.08, 0, -0.18 + pose.earSway]}
          >
            <mesh position={[0, 0.09, 0]} castShadow>
              <capsuleGeometry args={[0.065, 0.18, 6, 12]} />
              <meshStandardMaterial color={CLAY} roughness={0.96} />
            </mesh>
          </group>
          <group position={[0.2, 0.4, -0.02]} rotation={[0.12, 0, -0.55]}>
            <mesh position={[0, 0.065, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.12, 6, 12]} />
              <meshStandardMaterial color={CLAY} roughness={0.96} />
            </mesh>
          </group>

          <mesh position={[-0.105, 0.27, 0.268]} scale={[0.032, 0.045, 0.018]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color={FEATURES} roughness={0.88} />
          </mesh>
          <mesh position={[0.105, 0.255, 0.271]} scale={[0.03, 0.043, 0.018]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color={FEATURES} roughness={0.88} />
          </mesh>

          {[
            [0.19, 0.19, 0.25],
            [0.215, 0.145, 0.238],
            [0.175, 0.12, 0.252],
          ].map(([x, y, z], index) => (
            <mesh key={index} position={[x, y, z]} scale={[0.014, 0.014, 0.008]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color={FRECKLES} roughness={1} />
            </mesh>
          ))}

          <mesh position={[-0.01, 0.14, 0.278]}>
            <tubeGeometry args={[smile, 10, 0.012, 6, false]} />
            <meshStandardMaterial color={FEATURES} roughness={0.9} />
          </mesh>
        </group>
      </group>

      <group ref={leftArm} position={[-0.31, 0.55 + pose.bodyLift, 0]} rotation={[pose.leftArm, 0, 0.14]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.17, 5, 10]} />
          <meshStandardMaterial color={CLAY} roughness={0.96} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.31, 0.55 + pose.bodyLift, 0]} rotation={[pose.rightArm, 0, -0.14]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.17, 5, 10]} />
          <meshStandardMaterial color={CLAY} roughness={0.96} />
        </mesh>
      </group>

      <group ref={leftLeg} position={[-0.14, 0.22, 0]} rotation={[pose.leftLeg, 0, 0]}>
        <mesh position={[0, -0.08, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.12, 5, 10]} />
          <meshStandardMaterial color={CLAY} roughness={0.96} />
        </mesh>
        <mesh ref={leftFoot} position={[0, -0.155, 0.045]} scale={[0.14, 0.065, 0.19]} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color={CLAY} roughness={0.96} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.14, 0.22, 0]} rotation={[pose.rightLeg, 0, 0]}>
        <mesh position={[0, -0.08, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.12, 5, 10]} />
          <meshStandardMaterial color={CLAY} roughness={0.96} />
        </mesh>
        <mesh ref={rightFoot} position={[0, -0.155, 0.045]} scale={[0.14, 0.065, 0.19]} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color={CLAY} roughness={0.96} />
        </mesh>
      </group>
    </group>
  );
}
