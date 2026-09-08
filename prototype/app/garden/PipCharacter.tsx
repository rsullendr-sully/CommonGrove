'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { characterActing } from './characterActing';
import { groundedStep } from './groundedStep';
import { spriteSquash } from './spriteSquash';
import * as THREE from 'three';
import type { PipPose } from './pipPose';
import { RESIDENTS, type ResidentAppearance } from './residents';
import { projectMotion, type ProjectVisual } from './projectActivity';
import { ProjectTool } from './PlanterProject';

// Shared continuous seed shell, with Pip's approved sprite as the reference.
function sculptHead(shape: ResidentAppearance['headShape']) {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  const vertices = geometry.attributes.position;
  const rounded = (value: number) => Math.sign(value) * Math.pow(Math.abs(value), .58);
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    if (shape === 'roundling') {
      const taper = 1 - Math.max(0, y) * .22;
      vertices.setXYZ(i, rounded(x) * .36 * taper, rounded(y) * .34, rounded(z) * .30 * taper);
    }
    else if (shape === 'wisp') {
      const taper = 1 - Math.max(0, y) * .18;
      vertices.setXYZ(i, rounded(x) * .38 * taper, rounded(y) * .34, rounded(z) * .30 * taper);
    } else {
      const taper = 1 - Math.max(0, y) * .10;
      vertices.setXYZ(i, rounded(x) * .40 * taper, rounded(y) * .34, rounded(z) * .30 * taper);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function SpriteCrest({ appearance }: { appearance: ResidentAppearance }) {
  const material = <meshStandardMaterial color={appearance.accent} roughness={1} />;
  if (appearance.headShape === 'wisp') return <group position={[0, .31, -.035]} rotation={[.1, 0, -.18]}>
    <mesh position={[-.045, .065, 0]} rotation={[0, 0, .65]} scale={[.055, .12, .025]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#83ae69" roughness={.95} /></mesh>
    <mesh position={[.045, .045, .015]} rotation={[0, 0, -.85]} scale={[.047, .095, .025]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#b1cb79" roughness={.95} /></mesh>
  </group>;
  if (appearance.headShape === 'pebblekin') return <group position={[0, .31, -.035]} rotation={[.05, 0, .18]}>
    {[-1, 0, 1].map(side => <mesh key={side} position={[side * .055, .045, 0]} rotation={[0, side * .25, -side * .7]} scale={[.043, side === 0 ? .10 : .075, .032]} castShadow><sphereGeometry args={[1, 20, 14]} />{material}</mesh>)}
  </group>;
  return <group position={[.025, .33, -.015]} rotation={[.06, 0, -.28]}>
    <mesh position={[0, .04, 0]} scale={[.055, .09, .047]} castShadow><sphereGeometry args={[1, 20, 14]} />{material}</mesh>
    <mesh position={[-.045, .015, .015]} rotation={[0, 0, .8]} scale={[.035, .065, .022]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color="#b1cb79" roughness={.95} /></mesh>
  </group>;
}

function FeelingIcon({ feeling }: { feeling: PipPose['expression'] }) {
  const heart = useMemo(() => {
    const path = new THREE.Shape();
    path.moveTo(0, -.065);
    path.bezierCurveTo(-.15, .025, -.065, .14, 0, .06);
    path.bezierCurveTo(.065, .14, .15, .025, 0, -.065);
    return path;
  }, []);
  const sparkle = useMemo(() => {
    const path = new THREE.Shape();
    path.moveTo(0, .09);
    [[.023, .025], [.08, 0], [.023, -.025], [0, -.09], [-.023, -.025], [-.08, 0], [-.023, .025]].forEach(([x, y]) => path.lineTo(x, y));
    path.closePath();
    return path;
  }, []);
  if (feeling !== 'loved' && feeling !== 'happy' && feeling !== 'playful') return null;
  return <group position={[.3, .52, .08]}>
    <mesh><shapeGeometry args={[feeling === 'loved' ? heart : sparkle]} /><meshBasicMaterial color={feeling === 'loved' ? '#e996a8' : '#ffe2a3'} side={THREE.DoubleSide} /></mesh>
    <mesh position={[.085, .075, 0]} scale={.32}><shapeGeometry args={[sparkle]} /><meshBasicMaterial color="#fff1cd" side={THREE.DoubleSide} /></mesh>
  </group>;
}

export default function PipCharacter({ pose, project, appearance = RESIDENTS[0].appearance, reducedMotion = false }: { pose: PipPose; project?: ProjectVisual; appearance?: ResidentAppearance; reducedMotion?: boolean }): React.JSX.Element {
  const shape = appearance.headShape;
  const head = useMemo(() => sculptHead(shape), [shape]);
  const closedEyes = pose.expression === 'loved' || pose.expression === 'sleepy';
  const headRig = useRef<THREE.Group>(null);
  const bodyRig = useRef<THREE.Group>(null);
  const projectAttachment = useRef<THREE.Group>(null);
  const feet = useRef<(THREE.Group | null)[]>([]);
  const iconRig = useRef<THREE.Group>(null);
  const openEyes = useRef<(THREE.Group | null)[]>([]);
  const pupils = useRef<(THREE.Group | null)[]>([]);
  const lastActivity = useRef(pose.activity);
  const activityStarted = useRef<number | null>(null);
  const eyeOpenness = useRef(closedEyes ? 0 : 1);
  const happy = pose.expression === 'happy' || pose.expression === 'playful' || pose.expression === 'loved';
  const eyeArc = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.044, 0, 0), new THREE.Vector3(0, .045, 0), new THREE.Vector3(.044, 0, 0)), []);
  useEffect(() => () => head.dispose(), [head]);
  const smile = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.035, .007, 0), new THREE.Vector3(0, -.02, .002), new THREE.Vector3(.04, .01, 0)), []);
  const faceDepth = .298;
  const headHeight = .42;
  const eyes = shape === 'pebblekin' ? .118 : .112;
  useFrame(({ clock }, delta) => {
    const work = project ? projectMotion(project) : {
      lean: 0, tap: 0, tilt: 0, fitRotation: 0, settle: 0, reach: 0, contact: false,
    };
    if (projectAttachment.current) {
      projectAttachment.current.position.y = work.settle;
      projectAttachment.current.position.z = .065 + work.reach;
      projectAttachment.current.rotation.x = work.fitRotation - work.tap - (work.contact && project?.action === 'tap' ? .16 : 0);
      projectAttachment.current.rotation.z = work.tilt;
    }
    const walking = pose.walkDistance !== undefined;
    const phase = (pose.walkDistance ?? 0) / .42 * Math.PI * 2;
    if (bodyRig.current) {
      const sway = walking && !reducedMotion ? Math.sin(phase) * .024 : 0;
      bodyRig.current.position.x = THREE.MathUtils.damp(bodyRig.current.position.x, sway, 18, Math.min(delta, .05));
      bodyRig.current.position.y = THREE.MathUtils.damp(bodyRig.current.position.y, pose.bodyLift * .7, 14, Math.min(delta, .05));
      bodyRig.current.rotation.z = -bodyRig.current.position.x * 1.1;
      bodyRig.current.rotation.x = pose.bodyLean * .5 + work.lean;
    }
    feet.current.forEach((foot, index) => {
      if (!foot) return;
      const step = groundedStep(pose.walkDistance ?? 0, index * .5);
      const tucked = pose.activity === 'carried';
      const y = tucked ? .1 : walking ? step.lift : 0;
      const z = tucked ? -.07 : walking ? step.forward : 0;
      // Do not damp a planted foot: that would reintroduce skating.
      foot.position.y = walking ? .065 + y : THREE.MathUtils.damp(foot.position.y, .065 + y, 18, Math.min(delta, .05));
      foot.position.z = walking ? z : THREE.MathUtils.damp(foot.position.z, z, 18, Math.min(delta, .05));
      foot.rotation.x = walking ? -step.lift * 1.7 : 0;
    });
    if (activityStarted.current === null || lastActivity.current !== pose.activity) {
      activityStarted.current = clock.elapsedTime;
      lastActivity.current = pose.activity;
    }
    const acting = characterActing(pose.activity ?? 'idle', clock.elapsedTime, clock.elapsedTime - activityStarted.current,
      shape === 'wisp' ? .7 : shape === 'pebblekin' ? 2.1 : 3.4, reducedMotion);
    eyeOpenness.current = reducedMotion ? acting.eyeOpen : THREE.MathUtils.damp(eyeOpenness.current, acting.eyeOpen, 35, Math.min(delta, .05));
    openEyes.current.forEach(eye => { if (eye) eye.scale.y = Math.max(.025, eyeOpenness.current) * (happy ? .8 : .9); });
    pupils.current.forEach(pupil => { if (pupil) pupil.position.x = acting.glance; });
    if (headRig.current) {
      headRig.current.rotation.x = project?.performing && (project.action === 'read' || project.action === 'inspect' || project.action === 'observe') ? work.tilt : 0;
      headRig.current.rotation.y = acting.headTurn;
      headRig.current.rotation.z = reducedMotion ? pose.headTilt * .55 : THREE.MathUtils.damp(headRig.current.rotation.z, pose.headTilt * .55, 8, Math.min(delta, .05));
      headRig.current.position.y = headHeight - pose.headLower * .15 + acting.breathe;
    }
    if (bodyRig.current) {
      const squash = spriteSquash(pose.walkDistance, reducedMotion, acting.perk);
      bodyRig.current.scale.set(squash.x, squash.y, squash.z);
      bodyRig.current.position.y = squash.lift + (pose.activity === 'rest' ? -.025 : 0);
    }
    if (iconRig.current) iconRig.current.visible = acting.iconVisible;
  });
  return <group>
    <group ref={bodyRig} rotation={[pose.bodyLean * .5, 0, 0]}>
      {[-1, 1].map(side => <group key={side} position={[side * (shape === 'pebblekin' ? .37 : shape === 'roundling' ? .33 : .35), .275, -.005]} rotation={[0, 0, side * -.2]}>
        <mesh scale={[.055, .035, .075]} castShadow><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color={appearance.body} roughness={.94} /></mesh>
        {side === 1 && project?.tool && <group ref={projectAttachment} name="project-tool-attachment" position={[.025, 0, .065]} userData={{ tool: project.tool }}><ProjectTool kind={project.tool} /></group>}
      </group>)}
      <group ref={headRig} position={[0, headHeight - pose.headLower * .15, 0]} scale={[1, .85, 1]}>
        <mesh geometry={head} castShadow><meshStandardMaterial color={appearance.body} roughness={.94} /></mesh>
        <SpriteCrest appearance={appearance} />
        <group ref={iconRig}><FeelingIcon feeling={pose.expression} /></group>
        {[-1, 1].map((side, index) => <group key={side} position={[side * eyes, -.036, faceDepth]} rotation={[0, side * .15, 0]} scale={[1, 1, .4]}>
          <group ref={node => { openEyes.current[index] = node; }} visible={!closedEyes} scale={[.9, happy ? .8 : .9, 1]}>
          <group ref={node => { pupils.current[index] = node; }}>
          <mesh position={[0, .005, .03]} scale={[.037, .052, .012]}><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color="#403329" roughness={.8} /></mesh>
          <mesh position={[-.01, .025, .044]} scale={[.01, .012, .003]}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#fff9e9" /></mesh>
          </group>
          </group>
          <mesh visible={closedEyes} position={[0, -.008, .046]} rotation={[0, 0, pose.expression === 'sleepy' ? Math.PI : 0]}><tubeGeometry args={[eyeArc, 12, .007, 6, false]} /><meshStandardMaterial color="#5b4638" roughness={1} /></mesh>
        </group>)}
        <mesh position={[0, -.126, faceDepth + .005]} scale={[happy ? 1.4 : 1.15, happy ? 1.5 : 1, 1]} visible={pose.mouthOpen === 0}><tubeGeometry args={[smile, 12, .006, 6, false]} /><meshStandardMaterial color="#584731" roughness={1} /></mesh>
        <mesh visible={pose.mouthOpen > 0} position={[0, -.127, faceDepth + .006]} scale={[.025, Math.max(.008, pose.mouthOpen * .7), .008]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#584731" roughness={1} /></mesh>
      </group>
    </group>
    {[-1, 1].map((side, index) => {
      return <group ref={node => { feet.current[index] = node; }} key={side} position={[side * .155, .065, 0]} rotation={[0, 0, 0]}>
        <mesh scale={[.11, .065, .13]} castShadow><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={appearance.accent} roughness={.95} /></mesh>
      </group>;
    })}
  </group>;
}
