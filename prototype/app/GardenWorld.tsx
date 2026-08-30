'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Image from 'next/image';
import { MutableRefObject, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import InteractionPrompt from './garden/InteractionPrompt';
import {
  GardenSnack,
  GardenToy,
  createToyPlayApproach,
  projectGardenObjectOffer,
  resolveToyPlayFrame,
  resolveGardenObjectPlacement,
  type GardenObjectId,
} from './garden/GardenObjects';
import PipCharacter from './garden/PipCharacter';
import StorybookGardenEnvironment from './garden/StorybookGardenEnvironment';
import { actionEventForLiveTarget, actionLabelForLiveTarget, type InteractableId } from './garden/interaction';
import { getFirstPersonMovementVector } from './garden/firstPersonMovement';
import { PIP_MOTION_CONFIG, PIP_REWARD_MOTION_CONFIG, stepSafeRouteLocomotion, type LocomotionState } from './garden/locomotion';
import { createSafeGardenRoute, createSafeGreetingApproach, GARDEN_OBSTACLES, nearestSafePoint, selectCurrentGardenInterests, type GardenInterest, type GardenPoint } from './garden/navigation';
import {
  PIP_PET_REACTION_SECONDS,
  CAMERA_CONTROLS_FRAME_PRIORITY,
  PIP_INTERACTION_FRAME_PRIORITY,
  canDirectlyInteractWithPip,
  employeeWalkSpeedWhileHolding,
  handleHeldInteractionEscape,
  projectPipPlacement,
  resolvePipPlacement,
  shouldSuspendPipMotion,
  updateCarriedPipTransform,
  updatePlacedPipTransform,
  yawTowardEmployee,
  type PipInteractionPhase,
} from './garden/pipInteraction';
import { pipInteractionStatusText, pipLiveRegionLabel } from './garden/pipInteractionPresentation';
import {
  consumePipResumeSequence,
  createPipInteractionSceneState,
  eligibleInteractionTarget,
  pipInteractionSceneReducer,
  scheduleDirectGreetingCompletion,
  scheduleObjectReactionCompletion,
  schedulePipSceneEvent,
} from './garden/pipInteractionScene';
import { getPipPose, type PipPose } from './garden/pipPose';
import { type GardenChoice } from './garden/rewardState';
import { useInteractionTarget, type InteractionTargetRegistration } from './garden/useInteractionTarget';
import { usePipBehavior, type PipPriorityMission } from './garden/usePipBehavior';

const GARDEN_HALF_SIZE = 20;
const PLAYER_MARGIN = 1;

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

function FirstPersonControls({ movement, speed, onCameraMount }: { movement: MovementInput; speed: number; onCameraMount: (camera: THREE.Camera | null) => void }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const dragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const nextPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(0, 1.7, 17);
    onCameraMount(camera);

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
      onCameraMount(null);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      gl.domElement.removeEventListener('pointerdown', onPointerDown);
      gl.domElement.removeEventListener('pointermove', onPointerMove);
      gl.domElement.removeEventListener('pointerup', onPointerUp);
      gl.domElement.removeEventListener('pointercancel', onPointerUp);
    };
  }, [camera, gl, movement, onCameraMount]);

  useFrame((_, delta) => {
    const candidatePosition = nextPosition.current;
    const pressed = movement.current;
    const forwardAmount = Number(pressed.has('w') || pressed.has('arrowup')) - Number(pressed.has('s') || pressed.has('arrowdown'));
    const sideAmount = Number(pressed.has('d') || pressed.has('arrowright')) - Number(pressed.has('a') || pressed.has('arrowleft'));
    const movementVector = getFirstPersonMovementVector(yaw.current, forwardAmount, sideAmount);
    const frameDistance = speed * Math.min(delta, 0.05);

    candidatePosition.copy(camera.position);
    candidatePosition.x += movementVector.x * frameDistance;
    candidatePosition.z += movementVector.z * frameDistance;
    candidatePosition.x = THREE.MathUtils.clamp(candidatePosition.x, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);
    candidatePosition.z = THREE.MathUtils.clamp(candidatePosition.z, -GARDEN_HALF_SIZE + PLAYER_MARGIN, GARDEN_HALF_SIZE - PLAYER_MARGIN);

    GARDEN_OBSTACLES.forEach((obstacle) => {
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
  }, CAMERA_CONTROLS_FRAME_PRIORITY);

  return null;
}

const gardenInterestDefinitions: readonly GardenInterest[] = [
  { id: 'flowers', position: { x: 8.8, z: -5.9 } },
  { id: 'pond', position: { x: 8.2, z: 6.6 } },
  { id: 'pavilion', position: { x: -8.65, z: -8.1 } },
  { id: 'seed', position: { x: -8.5, z: 7.4 } },
  { id: 'destination', position: { x: -10.6, z: 9.2 } },
  { id: 'wander-east', position: { x: 8.4, z: 1.5 } },
  { id: 'wander-south', position: { x: 6.8, z: -7.2 } },
  { id: 'wander-west', position: { x: -6.3, z: 7.1 } },
];

function Pip({ onPipMount, onMessage, onPriorityModeChange, onGreetingArrived, onToyNudged, rewardStage, gardenChoice, interests, reducedMotion, interactionPhase, interactionTarget, placedPosition, resumeSequence }: { onPipMount: (pip: THREE.Group | null) => void; onMessage: (message: string | null) => void; onPriorityModeChange: (priority: boolean) => void; onGreetingArrived: () => void; onToyNudged: () => void; rewardStage: number; gardenChoice: GardenChoice | null; interests: readonly GardenInterest[]; reducedMotion: boolean; interactionPhase: PipInteractionPhase; interactionTarget: GardenPoint | null; placedPosition: GardenPoint | null; resumeSequence: number }) {
  const pip = useRef<THREE.Group>(null);
  const setPipRef = useCallback((node: THREE.Group | null) => {
    pip.current = node;
    onPipMount(node);
  }, [onPipMount]);
  const pipMotion = useRef<LocomotionState>({
    position: new THREE.Vector3(8.4, 0, 1.5),
    facing: Math.PI,
    speed: 0,
    distanceTravelled: 0,
    moving: false,
  });
  const [pose, setPose] = useState<PipPose>(() => getPipPose({
    poseKind: 'idle',
    speed: 0,
    distanceTravelled: 0,
    attentive: false,
    reducedMotion,
  }));
  const routeTargetKey = useRef<string | null>(null);
  const routeWaypoints = useRef<readonly GardenPoint[]>([]);
  const routeIndex = useRef(0);
  const consumedResumeSequence = useRef(0);
  const interactionStartedAt = useRef<number | null>(null);
  const toyNudgeSent = useRef(false);
  const directGreetingRecorded = useRef(false);
  const greetingArrivalSent = useRef(false);
  const rewardMission = useMemo<PipPriorityMission | null>(() => {
    if (rewardStage === 1) return {
      id: 'reward-1',
      target: { x: 8.2, z: 6.6 },
      startMessage: 'One ear lifts. Pip noticed something change near the pond.',
      completionMessage: 'It bloomed! Something kind reached the garden.',
    };
    if (rewardStage === 2) return {
      id: 'reward-2',
      target: { x: -8.65, z: -8.1 },
      startMessage: 'A warm chime carries from the reading pavilion. Pip turns toward it.',
      completionMessage: 'The nook is ready. Pip settles beside the new books for a moment.',
    };
    if (rewardStage === 3) return {
      id: 'reward-3',
      target: { x: -8.5, z: 7.4 },
      startMessage: 'A tiny golden light appears by the unopened path. Pip hurries to see.',
      completionMessage: 'A curious seed! Pip leaves it safely waiting for your choice.',
    };
    return null;
  }, [rewardStage]);
  const choiceMission = useMemo<PipPriorityMission | null>(() => gardenChoice ? {
    id: `choice-${gardenChoice}`,
    target: { x: -10.6, z: 9.2 },
    startMessage: gardenChoice === 'orchard'
      ? 'Soft lanterns flicker to life. Pip trots toward the new orchard path.'
      : 'A cheerful little tap echoes across the lawn. Pip heads for the workshop path.',
    completionMessage: gardenChoice === 'orchard'
      ? 'The lantern saplings are taking root. Pip curls up in their warm glow.'
      : 'The workshop foundation is ready. Pip listens for the next useful idea.',
  } : null, [gardenChoice]);
  const behavior = usePipBehavior(interests);

  useEffect(() => onMessage(behavior.message), [behavior.message, onMessage]);
  useEffect(
    () => onPriorityModeChange(!canDirectlyInteractWithPip(behavior.mode, behavior.activity?.kind ?? null)),
    [behavior.activity?.kind, behavior.mode, onPriorityModeChange],
  );

  useFrame(({ clock, camera }, delta) => {
    if (pip.current) {
      const distanceToVisitor = Math.hypot(
        pip.current.position.x - camera.position.x,
        pip.current.position.z - camera.position.z,
      );
      if (interactionPhase === 'greet-approach') {
        if (!directGreetingRecorded.current) {
          behavior.recordDirectGreeting(clock.elapsedTime);
          directGreetingRecorded.current = true;
        }
        const targetKey = 'interaction-greet';
        if (routeTargetKey.current !== targetKey) {
          routeTargetKey.current = targetKey;
          const approach = createSafeGreetingApproach(
            { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
            { x: camera.position.x, z: camera.position.z },
            GARDEN_OBSTACLES,
          );
          routeWaypoints.current = approach.route;
          routeIndex.current = 0;
        }
        const routeProgress = stepSafeRouteLocomotion(
          { motion: pipMotion.current, waypointIndex: routeIndex.current, complete: false },
          routeWaypoints.current,
          delta,
          PIP_MOTION_CONFIG,
          GARDEN_OBSTACLES,
        );
        pipMotion.current = routeProgress.motion;
        routeIndex.current = routeProgress.waypointIndex;
        pip.current.position.copy(pipMotion.current.position);
        pip.current.rotation.y = yawTowardEmployee(
          { x: pip.current.position.x, z: pip.current.position.z },
          { x: camera.position.x, z: camera.position.z },
        );
        if (routeProgress.complete && !greetingArrivalSent.current) {
          greetingArrivalSent.current = true;
          onGreetingArrived();
        }
        setPose(getPipPose({
          poseKind: 'walk',
          speed: pipMotion.current.speed,
          distanceTravelled: pipMotion.current.distanceTravelled,
          attentive: true,
          reducedMotion,
        }));
        return;
      }

      if (interactionPhase !== 'greet') {
        directGreetingRecorded.current = false;
        greetingArrivalSent.current = false;
      }
      if (interactionPhase === 'eating' || interactionPhase === 'playing') {
        const startedAt = interactionStartedAt.current ?? clock.elapsedTime;
        interactionStartedAt.current = startedAt;
        const reactionElapsed = clock.elapsedTime - startedAt;
        const target = interactionTarget;
        if (target) {
          pip.current.rotation.y = Math.atan2(
            target.x - pip.current.position.x,
            target.z - pip.current.position.z,
          );
        }

        if (interactionPhase === 'playing' && target) {
          const targetKey = `interaction-toy:${target.x},${target.z}`;
          if (routeTargetKey.current !== targetKey) {
            routeTargetKey.current = targetKey;
            const approach = createToyPlayApproach(
              { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
              target,
              GARDEN_OBSTACLES,
            );
            routeWaypoints.current = approach.route;
            routeIndex.current = 0;
          }
          const routeProgress = stepSafeRouteLocomotion(
            { motion: pipMotion.current, waypointIndex: routeIndex.current, complete: false },
            routeWaypoints.current,
            delta,
            PIP_MOTION_CONFIG,
            GARDEN_OBSTACLES,
          );
          pipMotion.current = routeProgress.motion;
          routeIndex.current = routeProgress.waypointIndex;
          pip.current.position.copy(pipMotion.current.position);
          const playFrame = resolveToyPlayFrame(
            { x: pip.current.position.x, z: pip.current.position.z },
            target,
            pipMotion.current.facing,
            routeProgress.complete,
            toyNudgeSent.current,
          );
          pip.current.rotation.y = playFrame.facing;
          toyNudgeSent.current = playFrame.nudgeSent;
          if (playFrame.shouldNudge) {
            onToyNudged();
          }
          setPose(getPipPose({
            poseKind: routeProgress.complete ? 'playing' : 'walk',
            reactionElapsed,
            speed: pipMotion.current.speed,
            distanceTravelled: pipMotion.current.distanceTravelled,
            attentive: true,
            reducedMotion,
          }));
          return;
        }

        pipMotion.current = { ...pipMotion.current, speed: 0, moving: false };
        routeTargetKey.current = null;
        routeWaypoints.current = [];
        routeIndex.current = 0;
        setPose(getPipPose({
          poseKind: interactionPhase,
          reactionElapsed,
          speed: 0,
          distanceTravelled: pipMotion.current.distanceTravelled,
          attentive: true,
          reducedMotion,
        }));
        return;
      }

      interactionStartedAt.current = null;
      toyNudgeSent.current = false;
      if (shouldSuspendPipMotion(interactionPhase)) {
        pipMotion.current = { ...pipMotion.current, speed: 0, moving: false };
        routeTargetKey.current = null;
        routeWaypoints.current = [];
        routeIndex.current = 0;

        if (interactionPhase === 'carried') {
          updateCarriedPipTransform(camera, pip.current);
        } else if (interactionPhase === 'greet' || interactionPhase === 'pet') {
          pip.current.rotation.y = yawTowardEmployee(
            { x: pip.current.position.x, z: pip.current.position.z },
            { x: camera.position.x, z: camera.position.z },
          );
        } else if (interactionPhase === 'placed' && placedPosition) {
          pipMotion.current = {
            ...pipMotion.current,
            position: new THREE.Vector3(placedPosition.x, 0, placedPosition.z),
          };
          updatePlacedPipTransform(pip.current, placedPosition, GARDEN_OBSTACLES);
        }

        setPose(getPipPose({
          poseKind: interactionPhase,
          speed: 0,
          distanceTravelled: pipMotion.current.distanceTravelled,
          attentive: true,
          reducedMotion,
        }));
        return;
      }

      const nextConsumedResumeSequence = consumePipResumeSequence(
        consumedResumeSequence.current,
        resumeSequence,
        () => behavior.resumeAfterInteraction({
          now: clock.elapsedTime,
          employeeDistance: distanceToVisitor,
          employeePosition: { x: camera.position.x, z: camera.position.z },
          pipPosition: { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
          locomotionComplete: false,
          rewardMission,
          choiceMission,
        }),
      );
      if (nextConsumedResumeSequence !== consumedResumeSequence.current) {
        consumedResumeSequence.current = nextConsumedResumeSequence;
        setPose(getPipPose({
          poseKind: 'idle',
          speed: 0,
          distanceTravelled: pipMotion.current.distanceTravelled,
          attentive: distanceToVisitor < 3.15,
          reducedMotion,
        }));
        return;
      }

      let locomotionComplete = false;
      if (behavior.target) {
        const targetKey = `${behavior.target.x},${behavior.target.z}`;
        if (routeTargetKey.current !== targetKey) {
          routeTargetKey.current = targetKey;
          routeWaypoints.current = createSafeGardenRoute(
            { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
            behavior.target,
            GARDEN_OBSTACLES,
          );
          routeIndex.current = 0;
        }
        const routeProgress = stepSafeRouteLocomotion(
          { motion: pipMotion.current, waypointIndex: routeIndex.current, complete: false },
          routeWaypoints.current,
          delta,
          behavior.mode === 'priority' ? PIP_REWARD_MOTION_CONFIG : PIP_MOTION_CONFIG,
          GARDEN_OBSTACLES,
        );
        pipMotion.current = routeProgress.motion;
        routeIndex.current = routeProgress.waypointIndex;
        pip.current.position.copy(pipMotion.current.position);
        pip.current.rotation.y = pipMotion.current.facing;
        locomotionComplete = routeProgress.complete;
      } else if (pipMotion.current.moving || pipMotion.current.speed > 0) {
        pipMotion.current = { ...pipMotion.current, speed: 0, moving: false };
        routeTargetKey.current = null;
        routeWaypoints.current = [];
        routeIndex.current = 0;
      } else if (routeTargetKey.current !== null) {
        routeTargetKey.current = null;
        routeWaypoints.current = [];
        routeIndex.current = 0;
      }

      if (behavior.activity?.kind === 'greet' && (behavior.phase === 'performing' || locomotionComplete)) {
        pip.current.rotation.y = yawTowardEmployee(
          { x: pip.current.position.x, z: pip.current.position.z },
          { x: camera.position.x, z: camera.position.z },
        );
      }

      behavior.advance({
        now: clock.elapsedTime,
        employeeDistance: distanceToVisitor,
        employeePosition: { x: camera.position.x, z: camera.position.z },
        pipPosition: { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
        locomotionComplete,
        rewardMission,
        choiceMission,
      });

      const currentLocomotion = pipMotion.current;
      setPose(getPipPose({
        poseKind: behavior.poseKind,
        speed: currentLocomotion.moving ? currentLocomotion.speed : 0,
        distanceTravelled: currentLocomotion.distanceTravelled,
        attentive: distanceToVisitor < 3.15,
        reducedMotion,
      }));
    }
  }, PIP_INTERACTION_FRAME_PRIORITY);

  return (
    <group ref={setPipRef} position={[8.4, 0, 1.5]} rotation={[0, Math.PI, 0]} userData={{ interactableId: 'pip' }}>
      <mesh visible={interactionPhase !== 'carried'} name="blobShadow" position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.48, 0.31, 1]}>
        <circleGeometry args={[0.9, 24]} />
        <meshBasicMaterial color="#34483b" transparent opacity={0.24} />
      </mesh>
      <PipCharacter pose={pose} />
    </group>
  );
}

function InteractionTargetTracker({ registrations, onTargetChange, republishSequence }: { registrations: readonly InteractionTargetRegistration[]; onTargetChange: (target: InteractableId | null) => void; republishSequence: number }) {
  const interactionTarget = useInteractionTarget(registrations, 2.4);
  const target = interactionTarget?.target ?? null;

  useEffect(() => onTargetChange(target), [onTargetChange, republishSequence, target]);
  return null;
}

function GardenWorldScene({ movement, movementSpeed, pip, food, toy, onPipMount, onPipMessage, onPipPriorityModeChange, onGreetingArrived, onToyNudged, onInteractionTargetChange, onCameraMount, interactionPhase, interactionTarget, heldTarget, objectPositions, toyNudged, placedPosition, resumeSequence, focusRepublishSequence, rewardStage, starflowersVisible, pavilionImproved, seedVisible, destinationVisible, gardenChoice, reducedMotion }: { movement: MovementInput; movementSpeed: number; pip: MutableRefObject<THREE.Group | null>; food: MutableRefObject<THREE.Group | null>; toy: MutableRefObject<THREE.Group | null>; onPipMount: (pip: THREE.Group | null) => void; onPipMessage: (message: string | null) => void; onPipPriorityModeChange: (priority: boolean) => void; onGreetingArrived: () => void; onToyNudged: () => void; onInteractionTargetChange: (target: InteractableId | null) => void; onCameraMount: (camera: THREE.Camera | null) => void; interactionPhase: PipInteractionPhase; interactionTarget: GardenPoint | null; heldTarget: InteractableId | null; objectPositions: Record<GardenObjectId, readonly [number, number, number]>; toyNudged: boolean; placedPosition: GardenPoint | null; resumeSequence: number; focusRepublishSequence: number; rewardStage: number; starflowersVisible: boolean; pavilionImproved: boolean; seedVisible: boolean; destinationVisible: GardenChoice | null; gardenChoice: GardenChoice | null; reducedMotion: boolean }) {
  const grassTexture = useGrassTexture();
  const interactionTargets = useMemo<readonly InteractionTargetRegistration[]>(
    () => [
      ...(heldTarget === 'pip' ? [] : [{ target: 'pip' as const, ref: pip }]),
      ...(heldTarget === 'food' ? [] : [{ target: 'food' as const, ref: food }]),
      ...(heldTarget === 'toy' ? [] : [{ target: 'toy' as const, ref: toy }]),
    ],
    [food, heldTarget, pip, toy],
  );
  const interests = useMemo(
    () => selectCurrentGardenInterests(gardenInterestDefinitions, {
      seedVisible,
      destinationVisible: destinationVisible !== null,
    }),
    [destinationVisible, seedVisible],
  );
  return (
    <>
      <FrameCadence />
      <StorybookGardenEnvironment
        grassTexture={grassTexture}
        rewardStage={rewardStage}
        starflowersVisible={starflowersVisible}
        pavilionImproved={pavilionImproved}
        seedVisible={seedVisible}
        destinationVisible={destinationVisible}
        reducedMotion={reducedMotion}
      />
      <GardenSnack ref={food} position={objectPositions.food} carried={heldTarget === 'food'} />
      <GardenToy ref={toy} position={objectPositions.toy} carried={heldTarget === 'toy'} nudged={toyNudged} />
      <Pip onPipMount={onPipMount} onMessage={onPipMessage} onPriorityModeChange={onPipPriorityModeChange} onGreetingArrived={onGreetingArrived} onToyNudged={onToyNudged} rewardStage={rewardStage} gardenChoice={gardenChoice} interests={interests} reducedMotion={reducedMotion} interactionPhase={interactionPhase} interactionTarget={interactionTarget} placedPosition={placedPosition} resumeSequence={resumeSequence} />

      <FirstPersonControls movement={movement} speed={movementSpeed} onCameraMount={onCameraMount} />
      <InteractionTargetTracker registrations={interactionTargets} onTargetChange={onInteractionTargetChange} republishSequence={focusRepublishSequence} />
    </>
  );
}

export default function GardenWorld({ rewardStage, starflowersVisible, pavilionImproved, seedVisible, destinationVisible, gardenChoice }: { rewardStage: number; starflowersVisible: boolean; pavilionImproved: boolean; seedVisible: boolean; destinationVisible: GardenChoice | null; gardenChoice: GardenChoice | null }) {
  const movement = useRef(new Set<string>());
  const pip = useRef<THREE.Group>(null);
  const food = useRef<THREE.Group>(null);
  const toy = useRef<THREE.Group>(null);
  const camera = useRef<THREE.Camera | null>(null);
  const [pipMessage, setPipMessage] = useState<string | null>(null);
  const [pipPriorityMissionActive, setPipPriorityMissionActive] = useState(false);
  const [pipInteractionScene, dispatchPipInteractionScene] = useReducer(
    pipInteractionSceneReducer,
    undefined,
    createPipInteractionSceneState,
  );
  const { interaction, phase: pipInteractionPhase, placedPosition, placementMessage, objectPositions, toyNudged, focusRepublishSequence } = pipInteractionScene;
  const [liveInteractionTarget, setLiveInteractionTarget] = useState<InteractableId | null>(null);
  const reducedMotion = useReducedMotion();
  const eligibleLiveTarget = eligibleInteractionTarget(liveInteractionTarget, pipPriorityMissionActive);
  const unavailableOffer = interaction.mode === 'carrying' && interaction.held !== 'pip' && liveInteractionTarget === 'pip' && pipPriorityMissionActive;
  const interactionLabel = unavailableOffer ? null : actionLabelForLiveTarget(interaction, eligibleLiveTarget);
  const offeredObject = interaction.mode === 'reacting' ? interaction.offered : null;
  const movementSpeed = employeeWalkSpeedWhileHolding(interaction.held);
  const visiblePipMessage = pipInteractionStatusText(
    pipInteractionPhase,
    placementMessage,
    pipMessage,
  );
  const pipLiveLabel = pipLiveRegionLabel(visiblePipMessage);
  const onInteractionTargetChange = useCallback((target: InteractableId | null) => {
    setLiveInteractionTarget(target);
    dispatchPipInteractionScene({ type: 'focus', target });
  }, []);
  const onPipMount = useCallback((node: THREE.Group | null) => {
    pip.current = node;
  }, []);
  const onCameraMount = useCallback((node: THREE.Camera | null) => {
    camera.current = node;
  }, []);
  const placePip = useCallback(() => {
    if (interaction.mode !== 'carrying' || interaction.held !== 'pip' || !camera.current || !pip.current) return;
    const recordedPosition = interaction.lastSafePosition;
    if (!recordedPosition) return;

    const forward = camera.current.getWorldDirection(new THREE.Vector3());
    const requested = projectPipPlacement(camera.current.position, forward);
    const result = resolvePipPlacement(
      requested,
      { x: recordedPosition[0], z: recordedPosition[2] },
      GARDEN_OBSTACLES,
    );
    dispatchPipInteractionScene({ type: 'place-pip', point: result.point, message: result.message });
  }, [interaction]);
  const placeObject = useCallback((target: GardenObjectId) => {
    if (interaction.mode !== 'carrying' || interaction.held !== target || !camera.current) return;
    const recordedPosition = interaction.lastSafePosition;
    if (!recordedPosition) return;
    const forward = camera.current.getWorldDirection(new THREE.Vector3());
    const requested = projectPipPlacement(camera.current.position, forward);
    const result = resolveGardenObjectPlacement(
      target,
      requested,
      { x: recordedPosition[0], z: recordedPosition[2] },
      GARDEN_OBSTACLES,
    );
    dispatchPipInteractionScene({ type: 'place-object', target, point: result.point, message: result.message });
  }, [interaction]);
  const placeHeld = useCallback(() => {
    if (interaction.held === 'pip') placePip();
    else if (interaction.held === 'food' || interaction.held === 'toy') placeObject(interaction.held);
  }, [interaction.held, placeObject, placePip]);
  const activateInteraction = useCallback(() => {
    if (interaction.mode === 'carrying') {
      if (interaction.held === 'pip') {
        placePip();
        return;
      }
      if (liveInteractionTarget === 'pip') {
        if (!pip.current || !camera.current) return;
        const reactionPoint = projectGardenObjectOffer(
          camera.current.position,
          camera.current.getWorldDirection(new THREE.Vector3()),
          GARDEN_OBSTACLES,
        );
        dispatchPipInteractionScene({
          type: 'offer-object',
          target: interaction.held,
          reactionPoint,
          pipAvailable: !pipPriorityMissionActive,
        });
        return;
      }
      placeObject(interaction.held);
      return;
    }
    const targetObject = eligibleLiveTarget === 'pip'
      ? pip.current
      : eligibleLiveTarget === 'food'
        ? food.current
        : eligibleLiveTarget === 'toy'
          ? toy.current
          : null;
    const safePoint = targetObject
      ? nearestSafePoint({ x: targetObject.position.x, z: targetObject.position.z }, GARDEN_OBSTACLES)
      : null;
    const safePosition = safePoint
      ? [safePoint.x, targetObject?.position.y ?? 0, safePoint.z] as const
      : null;
    const event = actionEventForLiveTarget(interaction, eligibleLiveTarget, safePosition);
    if (!event) return;

    dispatchPipInteractionScene({ type: 'activate', event });
  }, [eligibleLiveTarget, interaction, liveInteractionTarget, pipPriorityMissionActive, placeObject, placePip]);

  useEffect(() => {
    if (pipInteractionPhase !== 'greet') return;
    return scheduleDirectGreetingCompletion(
      pipInteractionScene,
      dispatchPipInteractionScene,
      window.setTimeout,
      window.clearTimeout,
    );
  }, [pipInteractionPhase, pipInteractionScene]);

  useEffect(() => {
    if (pipInteractionPhase !== 'pet') return;
    return schedulePipSceneEvent(
      dispatchPipInteractionScene,
      { type: 'pet-complete' },
      PIP_PET_REACTION_SECONDS * 1000,
      window.setTimeout,
      window.clearTimeout,
    );
  }, [pipInteractionPhase]);

  useEffect(() => {
    if (pipInteractionPhase !== 'eating' && pipInteractionPhase !== 'playing') return;
    return scheduleObjectReactionCompletion(
      pipInteractionScene,
      dispatchPipInteractionScene,
      window.setTimeout,
      window.clearTimeout,
    );
  }, [pipInteractionPhase, pipInteractionScene, toyNudged]);

  useEffect(() => {
    if (pipInteractionPhase !== 'placed') return;
    return schedulePipSceneEvent(
      dispatchPipInteractionScene,
      { type: 'placed-complete' },
      350,
      window.setTimeout,
      window.clearTimeout,
    );
  }, [pipInteractionPhase]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      handleHeldInteractionEscape(event, interaction.held, placeHeld);
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [interaction.held, placeHeld]);
  const startMoving = (key: string) => movement.current.add(key);
  const stopMoving = (key: string) => movement.current.delete(key);

  return (
    <div className="world-wrap">
      <Canvas frameloop="demand" shadows={false} camera={{ fov: 68, near: 0.1, far: 120 }} dpr={0.7} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <GardenWorldScene
          movement={movement}
          movementSpeed={movementSpeed}
          pip={pip}
          food={food}
          toy={toy}
          onPipMount={onPipMount}
          onPipMessage={setPipMessage}
          onPipPriorityModeChange={setPipPriorityMissionActive}
          onGreetingArrived={() => dispatchPipInteractionScene({ type: 'greet-arrived' })}
          onToyNudged={() => dispatchPipInteractionScene({ type: 'toy-nudged' })}
          onInteractionTargetChange={onInteractionTargetChange}
          onCameraMount={onCameraMount}
          interactionPhase={pipInteractionPhase}
          interactionTarget={pipInteractionPhase === 'eating' || pipInteractionPhase === 'playing'
            ? { x: objectPositions[offeredObject ?? 'food'][0], z: objectPositions[offeredObject ?? 'food'][2] }
            : null}
          heldTarget={interaction.held}
          objectPositions={objectPositions}
          toyNudged={toyNudged}
          placedPosition={placedPosition}
          resumeSequence={pipInteractionScene.resumeSequence}
          focusRepublishSequence={focusRepublishSequence}
          rewardStage={rewardStage}
          starflowersVisible={starflowersVisible}
          pavilionImproved={pavilionImproved}
          seedVisible={seedVisible}
          destinationVisible={destinationVisible}
          gardenChoice={gardenChoice}
          reducedMotion={reducedMotion}
        />
      </Canvas>
      <div className="world-reticle" aria-hidden="true" />
      <InteractionPrompt label={interactionLabel} onActivate={activateInteraction} />
      {visiblePipMessage && pipLiveLabel ? (
        <div className="pip-presence visible" role="status" aria-live="polite" aria-label={pipLiveLabel}>
          <Image src="/pip-detailed-v2.png" width={43} height={43} alt="" aria-hidden="true" />
          <span aria-hidden="true"><strong>Pip</strong>{' '}{visiblePipMessage}</span>
        </div>
      ) : null}
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
