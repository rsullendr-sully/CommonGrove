'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PipCharacter from './PipCharacter';
import { createResidentRandom, RESIDENT_WORLD_SCALE, type ResidentDefinition } from './residents';
import { getGardenElevation } from './gardenElevation';
import { createToyPlayApproach, resolveToyPlayFrame } from './GardenObjects';
import { PIP_MOTION_CONFIG, PIP_REWARD_MOTION_CONFIG, stepSafeRouteLocomotion, type LocomotionState } from './locomotion';
import { createSafeGardenRoute, createSafeGreetingApproach, nearestSafePoint, type GardenInterest, type GardenPoint } from './navigation';
import { PAVILION_READING_POINT } from './pavilionLayout';
import { PIP_INTERACTION_FRAME_PRIORITY, canDirectlyInteractWithPip, shouldHoldPipForInteraction, shouldSuspendPipMotion, updateCarriedPipTransform, updatePlacedPipTransform, yawTowardEmployee, type PipInteractionPhase } from './pipInteraction';
import { consumePipResumeSequence } from './pipInteractionScene';
import { getPipPose, type PipPose } from './pipPose';
import { usePipBehavior, type PipPriorityMission } from './usePipBehavior';
import type { GardenCommunity } from './CommunityCoordinator';
import type { GardenChoice } from './rewardState';
import type { PipJourneyProfile, Visit } from './journey';
import { projectVisual, stepProjectTravel, type ProjectVisual } from './projectActivity';

function safelyPlan<T>(plan: () => T, fallback: T): T {
  try { return plan(); } catch { return fallback; }
}

export type ResidentJourney = { visit: Visit; sceneVisit: Visit; comparing: boolean; profile: PipJourneyProfile };

export default function ResidentActor({ resident, community, spawn = resident.spawn, journey, onPipMount, onMessage, onPriorityModeChange, onGreetingArrived, onToyNudged, rewardStage, gardenChoice, interests, reducedMotion, interactionPhase, interactionTarget, interactionEngaged, placedPosition, resumeSequence }: { resident: ResidentDefinition; community: GardenCommunity; spawn?: readonly [number, number, number]; journey: ResidentJourney; onPipMount: (pip: THREE.Group | null) => void; onMessage: (message: string | null) => void; onPriorityModeChange: (priority: boolean) => void; onGreetingArrived: () => void; onToyNudged: () => void; rewardStage: number; gardenChoice: GardenChoice | null; interests: readonly GardenInterest[]; reducedMotion: boolean; interactionPhase: PipInteractionPhase; interactionTarget: GardenPoint | null; interactionEngaged: boolean; placedPosition: GardenPoint | null; resumeSequence: number }) {
  const pip = useRef<THREE.Group>(null);
  const setPipRef = useCallback((node: THREE.Group | null) => {
    pip.current = node;
    onPipMount(node);
  }, [onPipMount]);
  const pipMotion = useRef<LocomotionState>({
    position: new THREE.Vector3(...spawn),
    facing: 0,
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
  const [projectPose, setProjectPose] = useState<ProjectVisual | undefined>();
  const sharedActivity = useRef<string | null>(null);
  const lastProgress = useRef(0);
  const routeTargetKey = useRef<string | null>(null);
  const routeWaypoints = useRef<readonly GardenPoint[]>([]);
  const routePlanned = useRef(true);
  const routeIndex = useRef(0);
  const consumedResumeSequence = useRef(0);
  const interactionStartedAt = useRef<number | null>(null);
  const toyNudgeSent = useRef(false);
  const directGreetingRecorded = useRef(false);
  const nearbySince = useRef<number | null>(null);
  const greetingArrivalSent = useRef(false);
  const [initialChoice] = useState(gardenChoice);
  const rewardMission = useMemo<PipPriorityMission | null>(() => {
    if (resident.id !== 'pip' || journey.visit > 1) return null;
    if (rewardStage === 1) return {
      id: 'reward-1',
      target: { x: 8.2, z: 6.6 },
      startMessage: 'One ear lifts. Pip noticed something change near the pond.',
      completionMessage: 'It bloomed! Something kind reached the garden.',
    };
    if (rewardStage === 2) return {
      id: 'reward-2',
      target: { ...PAVILION_READING_POINT },
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
  }, [rewardStage, journey.visit, resident.id]);
  const choiceMission = useMemo<PipPriorityMission | null>(() => resident.id === 'pip' && gardenChoice && !(journey.visit > 1 && gardenChoice === initialChoice) ? {
    id: `choice-${gardenChoice}`,
    target: { x: -10.6, z: 9.2 },
    startMessage: gardenChoice === 'orchard'
      ? 'Soft lanterns flicker to life. Pip trots toward the new orchard path.'
      : 'A cheerful little tap echoes across the lawn. Pip heads for the workshop path.',
    completionMessage: gardenChoice === 'orchard'
      ? 'The lantern saplings are taking root. Pip curls up in their warm glow.'
      : 'The workshop foundation is ready. Pip listens for the next useful idea.',
  } : null, [gardenChoice, initialChoice, journey.visit, resident.id]);
  const random = useMemo(() => createResidentRandom(resident.seed), [resident.seed]);
  const behavior = usePipBehavior(interests, random, journey.profile);

  useEffect(() => onMessage(behavior.message?.replace(/Pip/g, resident.name) ?? null), [behavior.message, onMessage, resident.name]);
  useEffect(
    () => onPriorityModeChange(!canDirectlyInteractWithPip(behavior.mode)),
    [behavior.mode, onPriorityModeChange],
  );

  useFrame(({ clock, camera }, delta) => {
    if (pip.current) {
      // Actual interaction state wins immediately, including before the next parent render.
      if (interactionPhase !== 'none' || journey.comparing) {
        community.releaseProject(resident.id);
        setProjectPose(undefined);
      }
      if (journey.comparing) {
        pipMotion.current = { ...pipMotion.current, speed: 0, moving: false };
        setPose(getPipPose({ poseKind: 'idle', speed: 0, distanceTravelled: pipMotion.current.distanceTravelled, attentive: false, reducedMotion: true }));
        return;
      }
      const obstacles = community.obstacles(resident.id);
      const distanceToVisitor = Math.hypot(
        pip.current.position.x - camera.position.x,
        pip.current.position.z - camera.position.z,
      );
      if (distanceToVisitor > 4.1) nearbySince.current = null;
      else if (distanceToVisitor <= 3.6 && nearbySince.current === null) nearbySince.current = clock.elapsedTime;
      if (interactionPhase === 'greet-approach') {
        if (!directGreetingRecorded.current) {
          behavior.recordDirectGreeting(clock.elapsedTime);
          directGreetingRecorded.current = true;
        }
        const targetKey = 'interaction-greet';
        if (routeTargetKey.current !== targetKey) {
          routeTargetKey.current = targetKey;
          const plannedApproach = safelyPlan(() => createSafeGreetingApproach(
            { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
            { x: camera.position.x, z: camera.position.z },
            obstacles,
          ), null);
          routeWaypoints.current = plannedApproach?.route ?? [];
          routePlanned.current = plannedApproach !== null;
          routeIndex.current = 0;
        }
        const routeProgress = stepSafeRouteLocomotion(
          { motion: pipMotion.current, waypointIndex: routeIndex.current, complete: false },
          routeWaypoints.current,
          delta,
          PIP_MOTION_CONFIG,
          obstacles,
        );
        pipMotion.current = routeProgress.motion;
        routeIndex.current = routeProgress.waypointIndex;
        pip.current.position.copy(pipMotion.current.position);
        pip.current.rotation.y = yawTowardEmployee(
          { x: pip.current.position.x, z: pip.current.position.z },
          { x: camera.position.x, z: camera.position.z },
        );
        if (routePlanned.current && routeProgress.complete && !greetingArrivalSent.current) {
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
        const target = interactionPhase === 'playing' && toyNudgeSent.current ? community.state.toy.end : interactionTarget;
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
            const plannedApproach = safelyPlan(() => createToyPlayApproach(
              { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
              target,
              obstacles,
              1,
            ), null);
            routeWaypoints.current = plannedApproach?.route ?? [];
            routePlanned.current = plannedApproach !== null;
            routeIndex.current = 0;
          }
          const routeProgress = stepSafeRouteLocomotion(
            { motion: pipMotion.current, waypointIndex: routeIndex.current, complete: false },
            routeWaypoints.current,
            delta,
            PIP_MOTION_CONFIG,
            obstacles,
          );
          pipMotion.current = routeProgress.motion;
          routeIndex.current = routeProgress.waypointIndex;
          pip.current.position.copy(pipMotion.current.position);
          const playFrame = resolveToyPlayFrame(
            { x: pip.current.position.x, z: pip.current.position.z },
            target,
            pipMotion.current.facing,
            routePlanned.current && routeProgress.complete,
            toyNudgeSent.current,
          );
          pip.current.rotation.y = playFrame.facing;
          toyNudgeSent.current = playFrame.nudgeSent;
          if (playFrame.shouldNudge) {
            onToyNudged();
          }
          setPose(getPipPose({
            poseKind: routePlanned.current && routeProgress.complete ? 'playing' : 'walk',
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
          try {
            updatePlacedPipTransform(pip.current, placedPosition, obstacles);
          } catch {
            // A neighbor may have moved into the reserved point in this frame.
            // Keep the resident grounded and let the interaction finish safely.
            const fallback = safelyPlan(() => nearestSafePoint(
              { x: pip.current!.position.x, z: pip.current!.position.z },
              obstacles,
            ), { x: pipMotion.current.position.x, z: pipMotion.current.position.z });
            pipMotion.current = { ...pipMotion.current, position: new THREE.Vector3(fallback.x, 0, fallback.z) };
            pip.current.position.set(fallback.x, 0, fallback.z);
            community.recordPosition(resident.id, fallback);
          }
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
      // Detect newly queued rewards even while an ordinary project owns the feet.
      let priority = behavior.mode === 'priority';
      for (const mission of [rewardMission, choiceMission]) {
        if (mission) priority = behavior.interruptWithReward(mission, clock.elapsedTime).mode === 'priority';
      }
      if (priority) community.releaseProject(resident.id);
      const project = priority ? null : community.projectDirective(resident.id);
      if (project) {
        sharedActivity.current = project.key;
        const travel = stepProjectTravel({ motion: pipMotion.current, key: routeTargetKey.current,
          waypoints: routeWaypoints.current, waypointIndex: routeIndex.current, planned: routePlanned.current }, project, delta, obstacles);
        routeTargetKey.current = travel.key;
        routeWaypoints.current = travel.waypoints;
        routeIndex.current = travel.waypointIndex;
        routePlanned.current = travel.planned;
        pipMotion.current = travel.motion;
        pip.current.position.copy(travel.motion.position);
        pip.current.rotation.y = travel.arrived
          ? Math.atan2(project.lookAt.x - pip.current.position.x, project.lookAt.z - pip.current.position.z) : travel.motion.facing;
        setProjectPose(projectVisual({ ...project, phase: travel.arrived ? project.phase : 'approach' }, reducedMotion));
        setPose(getPipPose({ poseKind: travel.arrived ? 'inspect' : 'walk', speed: travel.motion.speed,
          distanceTravelled: travel.motion.distanceTravelled, attentive: true, reducedMotion }));
        return;
      }
      setProjectPose(undefined);
      const celebration = priority ? null : community.celebration(resident.id);
      if (celebration !== null) {
        pipMotion.current = { ...pipMotion.current, speed: 0, moving: false };
        setPose(getPipPose({ poseKind: 'greet', reactionElapsed: celebration, speed: 0,
          distanceTravelled: pipMotion.current.distanceTravelled, attentive: true, reducedMotion }));
        return;
      }
      const directive = community.directive(resident.id);
      if (directive && !priority) {
        const activityKey = directive.key.split(':').slice(0, 2).join(':');
        if (sharedActivity.current !== activityKey) {
          sharedActivity.current = activityKey;
          onMessage(directive.kind === 'play' ? resident.name + ' found the wooden rings. A little nudge, then a curious follow.'
            : directive.kind === 'watch' ? resident.name + ' watches the rings, leaving room for a turn.'
            : resident.name + ' notices a neighbor and wanders over to say hello.');
        }
        if (routeTargetKey.current !== directive.key) {
          routeTargetKey.current = directive.key;
          routeWaypoints.current = safelyPlan(() => createSafeGardenRoute(
            { x: pipMotion.current.position.x, z: pipMotion.current.position.z }, directive.target, obstacles), []);
          routeIndex.current = 0;
        }
        const progress = stepSafeRouteLocomotion(
          { motion: pipMotion.current, waypointIndex: routeIndex.current, complete: false },
          routeWaypoints.current, delta, PIP_MOTION_CONFIG, obstacles);
        pipMotion.current = progress.motion;
        routeIndex.current = progress.waypointIndex;
        pip.current.position.copy(progress.motion.position);
        const arrived = Math.hypot(pip.current.position.x - directive.target.x, pip.current.position.z - directive.target.z) < .18;
        pip.current.rotation.y = arrived ? Math.atan2(directive.lookAt.x - pip.current.position.x, directive.lookAt.z - pip.current.position.z) : progress.motion.facing;
        setPose(getPipPose({ poseKind: arrived ? directive.kind === 'play' && directive.performing ? 'playing' : directive.kind === 'greet' ? 'greet' : 'inspect' : 'walk',
          reactionElapsed: clock.elapsedTime % 3, speed: progress.motion.speed,
          distanceTravelled: progress.motion.distanceTravelled, attentive: true, reducedMotion }));
        return;
      }
      if (sharedActivity.current) {
        sharedActivity.current = null;
        routeTargetKey.current = null;
        behavior.resumeAfterInteraction({ now: clock.elapsedTime,
          employeeDistance: community.attention === resident.id ? distanceToVisitor : 100,
          employeePosition: { x: camera.position.x, z: camera.position.z },
          pipPosition: { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
          locomotionComplete: false, rewardMission, choiceMission });
      }

      const nextConsumedResumeSequence = consumePipResumeSequence(
        consumedResumeSequence.current,
        resumeSequence,
        () => behavior.resumeAfterInteraction({
          now: clock.elapsedTime,
          employeeDistance: community.attention === resident.id ? distanceToVisitor : 100,
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
          attentive: community.attention === resident.id && distanceToVisitor < 3.15,
          reducedMotion,
        }));
        return;
      }

      if (community.attention === resident.id && shouldHoldPipForInteraction(
        interactionEngaged,
        distanceToVisitor,
        behavior.activity?.kind ?? null,
        behavior.mode,
        interactionPhase,
        nearbySince.current === null ? 0 : clock.elapsedTime - nearbySince.current,
      )) {
        // Attention pauses his feet, not his lifecycle. New return greetings and
        // queued rewards must still be noticed while the visitor stands nearby.
        behavior.advance({
          now: clock.elapsedTime,
          employeeDistance: community.attention === resident.id ? distanceToVisitor : 100,
          employeePosition: { x: camera.position.x, z: camera.position.z },
          pipPosition: { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
          locomotionComplete: false,
          rewardMission,
          choiceMission,
        });
        pipMotion.current = { ...pipMotion.current, speed: 0, moving: false };
        pip.current.rotation.y = yawTowardEmployee(
          { x: pip.current.position.x, z: pip.current.position.z },
          { x: camera.position.x, z: camera.position.z },
        );
        setPose(getPipPose({
          poseKind: 'idle',
          speed: 0,
          distanceTravelled: pipMotion.current.distanceTravelled,
          attentive: true,
          reducedMotion,
        }));
        return;
      }

      let locomotionComplete = false;
      if (behavior.target) {
        const target = behavior.target;
        const targetKey = `${target.x},${target.z}`;
        if (routeTargetKey.current !== targetKey) {
          routeTargetKey.current = targetKey;
          const plannedRoute = safelyPlan(() => createSafeGardenRoute(
            { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
            target,
            obstacles,
          ), null);
          routeWaypoints.current = plannedRoute ?? [];
          routePlanned.current = plannedRoute !== null;
          routeIndex.current = 0;
        }
        const routeProgress = routePlanned.current
          ? stepSafeRouteLocomotion(
            { motion: pipMotion.current, waypointIndex: routeIndex.current, complete: false },
            routeWaypoints.current,
            delta,
            behavior.mode === 'priority' ? PIP_REWARD_MOTION_CONFIG : PIP_MOTION_CONFIG,
            obstacles,
          )
          : {
            motion: { ...pipMotion.current, speed: 0, moving: false },
            waypointIndex: routeIndex.current,
            complete: false,
          };
        pipMotion.current = routeProgress.motion;
        routeIndex.current = routeProgress.waypointIndex;
        pip.current.position.copy(pipMotion.current.position);
        pip.current.rotation.y = pipMotion.current.facing;
        locomotionComplete = routePlanned.current && routeProgress.complete;
        if (!routePlanned.current && clock.elapsedTime - lastProgress.current > 1.5) {
          routeTargetKey.current = null;
          lastProgress.current = clock.elapsedTime;
          if (behavior.mode === 'ordinary') behavior.completeActivity({
            now: clock.elapsedTime,
            employeeDistance: community.attention === resident.id ? distanceToVisitor : 100,
            employeePosition: { x: camera.position.x, z: camera.position.z },
            pipPosition: { x: pipMotion.current.position.x, z: pipMotion.current.position.z },
            locomotionComplete: false,
            rewardMission,
            choiceMission,
          });
        }
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
        employeeDistance: community.attention === resident.id ? distanceToVisitor : 100,
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
        attentive: community.attention === resident.id && distanceToVisitor < 3.15,
        reducedMotion,
      }));
    }
  }, PIP_INTERACTION_FRAME_PRIORITY);

  // Runs after locomotion (including its idle/placed early exits), before target tracking.
  useFrame(({ clock }) => {
    if (pip.current && interactionPhase !== 'carried') {
      pip.current.position.y = getGardenElevation(pip.current.position.x, pip.current.position.z);
      community.recordPosition(resident.id, pip.current.position);
      if (pipMotion.current.moving || !routeTargetKey.current) lastProgress.current = clock.elapsedTime;
      else if (clock.elapsedTime - lastProgress.current > 1.5) {
        routeTargetKey.current = null;
        lastProgress.current = clock.elapsedTime;
      }
    }
  }, PIP_INTERACTION_FRAME_PRIORITY);

  return (
    <group ref={setPipRef} position={[...spawn]} rotation={[0, 0, 0]} userData={{ interactableId: resident.id }}>
      <mesh visible={interactionPhase !== 'carried'} name="blobShadow" position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.48 * RESIDENT_WORLD_SCALE, 0.31 * RESIDENT_WORLD_SCALE, RESIDENT_WORLD_SCALE]}>
        <circleGeometry args={[0.9, 24]} />
        <meshBasicMaterial color="#405445" transparent opacity={0.2} />
      </mesh>
      <pointLight position={[0, 1.05 * RESIDENT_WORLD_SCALE, 0.35 * RESIDENT_WORLD_SCALE]} color="#ffe7b2" intensity={0.28} distance={2.4} decay={2} />
      <group scale={RESIDENT_WORLD_SCALE}>
        <PipCharacter pose={pose} project={interactionPhase === 'none' && !journey.comparing ? projectPose : undefined} appearance={resident.appearance} reducedMotion={reducedMotion || journey.comparing} />
      </group>
    </group>
  );
}
