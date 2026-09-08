'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { MutableRefObject, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { captureGardenLocalPosition, groundGardenPosition } from './garden/gardenElevation';
import InteractionPrompt, { interactionReticleClassName } from './garden/InteractionPrompt';
import { GardenSnack, GardenToy, projectGardenObjectOffer, resolveGardenObjectPlacement, type GardenObjectId } from './garden/GardenObjects';
import StorybookGardenEnvironment from './garden/StorybookGardenEnvironment';
import ResidentActor, { type ResidentJourney } from './garden/ResidentActor';
import CommunityCoordinator, { GardenCommunity } from './garden/CommunityCoordinator';
import { isResidentId, RESIDENTS, residentsForVisit, residentDefinition, type ResidentId, type ResidentTarget, type ResidentDefinition } from './garden/residents';
import { canonicalTarget, createResidentInteraction, residentInteractionReducer, residentActionLabel, residentPhase, type ResidentInteractionState } from './garden/residentInteraction';
import { actionEventForLiveTarget } from './garden/interaction';
import { getFirstPersonMovementVector, resolveFirstPersonGardenMove } from './garden/firstPersonMovement';
import { GARDEN_RENDER_QUALITY, GARDEN_TEXTURE_PATHS, prepareGardenTexture } from './garden/gardenSurface';
import { GARDEN_OBSTACLES, nearestSafePoint, selectCurrentGardenInterests, type GardenInterest } from './garden/navigation';
import { PAVILION_READING_POINT } from './garden/pavilionLayout';
import { CAMERA_CONTROLS_FRAME_PRIORITY, PIP_PET_REACTION_SECONDS, PIP_DIRECT_GREET_REACTION_SECONDS, PIP_EATING_REACTION_SECONDS, PIP_PLAYING_REACTION_SECONDS, employeeWalkSpeedWhileHolding, handleHeldInteractionEscape, projectPipPlacement, resolvePipPlacement } from './garden/pipInteraction';
import { pipInteractionStatusText } from './garden/pipInteractionPresentation';
import { schedulePipSceneEvent, type PipInteractionSceneEvent } from './garden/pipInteractionScene';
import { useInteractionTarget, type InteractionTargetRegistration } from './garden/useInteractionTarget';
import type { MemoryKind, PipJourneyProfile } from './garden/journey';
import type { GardenChoice } from './garden/rewardState';
import { residentLookAngles, type FindResidentRequest } from './garden/findResident';
import { createGardenMountHandshake } from './garden/gardenSession';
import type { ProjectEvent, ProjectsProgress } from './garden/projectProgress';
import { projectPlanter } from './garden/planterProgress';
import type { ProjectId } from './garden/projectDefinitions';
import PlanterProject from './garden/PlanterProject';
import { PLANTER_LAYOUT } from './garden/planterLayout';
import type { ProjectDirective } from './garden/projectScheduler';

type WorldJourney = ResidentJourney & { profiles: Record<ResidentId, PipJourneyProfile> };
type ResidentRefs = Record<ResidentId, MutableRefObject<THREE.Group | null>>;
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
  const source = useLoader(THREE.TextureLoader, GARDEN_TEXTURE_PATHS.grass);
  const texture = useMemo(
    () => prepareGardenTexture(source.clone(), 'grass'),
    [source],
  );

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function FirstPersonControls({ movement, speed, onCameraMount, findRequest, residents, community }: { movement: MovementInput; speed: number; onCameraMount: (camera: THREE.Camera | null) => void; findRequest: FindResidentRequest | null; residents: ResidentRefs; community: GardenCommunity }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.2);
  const dragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const nextPosition = useRef(new THREE.Vector3());
  const lastFind = useRef<number | null>(null);
  const findPosition = useRef(new THREE.Vector3());

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
        -1.25,
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
    if (findRequest && lastFind.current !== findRequest.sequence) {
      const resident = residents[findRequest.id].current;
      if (resident) {
        resident.getWorldPosition(findPosition.current);
        findPosition.current.y += .3;
        const look = residentLookAngles(camera.position, findPosition.current, yaw.current);
        yaw.current = look.yaw;
        pitch.current = look.pitch;
        movement.current.clear();
        lastFind.current = findRequest.sequence;
      }
    }
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
    const resolvedPosition = resolveFirstPersonGardenMove(
      { x: camera.position.x, z: camera.position.z },
      { x: candidatePosition.x - camera.position.x, z: candidatePosition.z - camera.position.z },
      community.playerObstacles(),
    );
    candidatePosition.x = resolvedPosition.x;
    candidatePosition.z = resolvedPosition.z;

    camera.position.set(...groundGardenPosition(candidatePosition.x, candidatePosition.z, 1.7));
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
  }, CAMERA_CONTROLS_FRAME_PRIORITY);

  return null;
}

const gardenInterestDefinitions: readonly GardenInterest[] = [
  { id: 'flowers', position: { x: 8.8, z: -5.9 } },
  { id: 'pond', position: { x: 8.2, z: 6.6 } },
  { id: 'pavilion', position: { ...PAVILION_READING_POINT } },
  { id: 'seed', position: { x: -8.5, z: 7.4 } },
  { id: 'destination', position: { x: -10.6, z: 9.2 } },
  { id: 'wander-east', position: { x: 8.4, z: 1.5 } },
  { id: 'wander-south', position: { x: 6.8, z: -7.2 } },
  { id: 'wander-west', position: { x: -6.3, z: 7.1 } },
];


function InteractionTargetTracker({ registrations, onTargetChange, republishSequence }: { registrations: readonly InteractionTargetRegistration[]; onTargetChange: (target: ResidentTarget | null) => void; republishSequence: number }) {
  const result = useInteractionTarget(registrations, 2.4);
  const target = result?.target ?? null;
  useEffect(() => onTargetChange(target), [onTargetChange, republishSequence, target]);
  return null;
}

function PlanterProjectScene({ community, progress }: { community: GardenCommunity; progress: ProjectsProgress }) {
  const [directives, setDirectives] = useState<Partial<Record<ResidentId, ProjectDirective>>>({});
  const presentationKey = useRef('');
  const [toolAnchors, setToolAnchors] = useState(() => community.projectRuntime?.toolAnchors);
  useFrame(() => {
    const next = Object.fromEntries(RESIDENTS.flatMap(({ id }) => {
      const directive = community.projectDirective(id);
      return directive ? [[id, { ...directive }]] : [];
    })) as Partial<Record<ResidentId, ProjectDirective>>;
    const key = RESIDENTS.map(({ id }) => {
      const directive = next[id];
      return directive ? `${id}:${directive.key}:${directive.action}:${directive.phase}:${directive.tool ?? ''}` : `${id}:`;
    }).join('|') + JSON.stringify(community.projectRuntime?.toolAnchors);
    if (key !== presentationKey.current) {
      presentationKey.current = key;
      setDirectives(next);
      setToolAnchors(community.projectRuntime?.toolAnchors);
    }
  }, -.4);
  const supplied = Object.values(progress.projects).some(p => p.supplies !== 'absent');
  return <PlanterProject progress={projectPlanter(progress)} layout={PLANTER_LAYOUT} directives={directives} toolAnchors={supplied ? toolAnchors : undefined} />;
}

type ResidentSlotProps = {
  resident: ResidentDefinition; journey: WorldJourney; player: ResidentInteractionState;
  onMount: (id: ResidentId, node: THREE.Group | null) => void;
  rewardStage: number; gardenChoice: GardenChoice | null; interests: readonly GardenInterest[]; reducedMotion: boolean;
  focused: ResidentTarget | null;
  community: GardenCommunity;
  onMessage: (id: ResidentId, message: string | null) => void;
  onPriority: (id: ResidentId, active: boolean) => void;
  onEvent: (id: ResidentId, event: PipInteractionSceneEvent) => void;
};
function ResidentSlot({ resident, journey, onMount, player, onMessage, onPriority, onEvent, ...props }: ResidentSlotProps) {
  const id = resident.id;
  const mount = useCallback((node: THREE.Group | null) => onMount(id, node), [id, onMount]);
  const message = useCallback((text: string | null) => onMessage(id, text), [id, onMessage]);
  const priority = useCallback((active: boolean) => onPriority(id, active), [id, onPriority]);
  const greet = useCallback(() => onEvent(id, { type: 'greet-arrived' }), [id, onEvent]);
  const community = props.community;
  const nudge = useCallback(() => { community.nudge(id); onEvent(id, { type: 'toy-nudged' }); }, [community, id, onEvent]);
  const localJourney = useMemo(() => ({ ...journey, profile: journey.profiles[id] }), [journey, id]);
  const phase = residentPhase(player, id);
  const offered = player.scene.interaction.mode === 'reacting' ? player.scene.interaction.offered : null;
  const position = player.scene.objectPositions[offered ?? 'food'];
  const spawn = useMemo(() => community.spawnPoint(id, resident.spawn), [community, id, resident.spawn]);
  return <ResidentActor resident={resident} journey={localJourney} community={community} spawn={spawn}
    onPipMount={mount} onMessage={message} onPriorityModeChange={priority}
    onGreetingArrived={greet} onToyNudged={nudge}
    rewardStage={props.rewardStage} gardenChoice={props.gardenChoice} interests={props.interests} reducedMotion={props.reducedMotion}
    interactionPhase={phase} interactionTarget={phase === 'eating' || phase === 'playing' ? { x: position[0], z: position[2] } : null}
    interactionEngaged={props.focused === id} placedPosition={player.placements[id] ?? null} resumeSequence={player.resumes[id]} />;
}

export default function GardenWorld({ journey, project, projection, demoResidents, activated, onActivities, epoch: projectEpoch, onProjectEvents, onRemount, onMemory, onBusyChange, rewardStage, starflowersVisible, pavilionImproved, seedVisible, destinationVisible, gardenChoice, findRequest = null }: {
  journey: WorldJourney; onMemory: (kind: MemoryKind, id: ResidentId) => void; onBusyChange: (busy: boolean) => void;
  demoResidents?: 1 | 3;
  activated?: readonly ProjectId[];
  onActivities?: (activities: Partial<Record<ResidentId, string>>) => void;
  project: ProjectsProgress; projection: ProjectsProgress; epoch: number;
  onProjectEvents: (epoch: number, events: ProjectEvent[]) => void; onRemount: () => void;
  rewardStage: number; starflowersVisible: boolean; pavilionImproved: boolean; seedVisible: boolean;
  destinationVisible: GardenChoice | null; gardenChoice: GardenChoice | null;
  findRequest?: FindResidentRequest | null;
}) {
  const [projectMount] = useState(() => createGardenMountHandshake(projectEpoch));
  const onRemountRef = useRef(onRemount);
  useEffect(() => {
    if (projectMount.mount()) onRemountRef.current();
    return () => projectMount.unmount();
  }, [projectMount]);
  const emitProjectEvents = useCallback((events: ProjectEvent[]) => {
    const acknowledgedEpoch = projectMount.acknowledgedEpoch(projectEpoch);
    if (acknowledgedEpoch !== null && events.length > 0) onProjectEvents(acknowledgedEpoch, events);
  }, [onProjectEvents, projectEpoch, projectMount]);
  const movement = useRef(new Set<string>());
  const [community] = useState(() => new GardenCommunity());
  const pipRef = useRef<THREE.Group | null>(null);
  const mossRef = useRef<THREE.Group | null>(null);
  const fernRef = useRef<THREE.Group | null>(null);
  const refs = useMemo<ResidentRefs>(() => ({ pip: pipRef, moss: mossRef, fern: fernRef }), []);
  const food = useRef<THREE.Group>(null);
  const toy = useRef<THREE.Group>(null);
  const camera = useRef<THREE.Camera | null>(null);
  const onResidentMount = useCallback((id: ResidentId, node: THREE.Group | null) => {
    if (id === 'pip') pipRef.current = node;
    else if (id === 'moss') mossRef.current = node;
    else fernRef.current = node;
  }, []);
  const [player, dispatch] = useReducer(residentInteractionReducer, undefined, createResidentInteraction);
  const [liveTarget, setLiveTarget] = useState<ResidentTarget | null>(null);
  const [messages, setMessages] = useState<Partial<Record<ResidentId, string | null>>>({});
  const [lastSpeaker, setLastSpeaker] = useState<ResidentId>('pip');
  const [priorities, setPriorities] = useState<Record<ResidentId, boolean>>({ pip: false, moss: false, fern: false });
  const reducedMotion = useReducedMotion();
  const roster = useMemo(() => demoResidents ? RESIDENTS.slice(0, demoResidents) : residentsForVisit(journey.sceneVisit), [demoResidents, journey.sceneVisit]);
  const { scene, activeId, epoch } = player;
  const { interaction, phase, placementMessage, objectPositions, toyNudged, greetingArrived } = scene;
  const eligibleTarget = isResidentId(liveTarget) && priorities[liveTarget] ? null : liveTarget;
  const unavailableOffer = interaction.mode === 'carrying' && interaction.held !== 'pip' && isResidentId(liveTarget) && priorities[liveTarget];
  const label = journey.comparing || unavailableOffer ? null : residentActionLabel(player, eligibleTarget);
  const speakerId = phase !== 'none' || placementMessage ? activeId : priorities.pip ? 'pip' : lastSpeaker;
  const speaker = residentDefinition(speakerId);
  const visibleMessage = pipInteractionStatusText(phase, placementMessage, messages[speakerId] ?? null)?.replace(/Pip/g, speaker.name) ?? null;
  const publishedMemory = useRef(0);
  useEffect(() => {
    const memory = player.completedMemory;
    if (memory && memory.sequence > publishedMemory.current) {
      publishedMemory.current = memory.sequence;
      onMemory(memory.kind, memory.id);
    }
    onBusyChange(interaction.mode !== 'idle' || phase !== 'none');
  }, [player.completedMemory, interaction.mode, phase, onMemory, onBusyChange]);
  const onMessage = useCallback((id: ResidentId, message: string | null) => {
    setMessages(previous => previous[id] === message ? previous : { ...previous, [id]: message });
    if (message) setLastSpeaker(id);
  }, []);
  const onPriority = useCallback((id: ResidentId, active: boolean) => {
    setPriorities(previous => previous[id] === active ? previous : { ...previous, [id]: active });
  }, []);
  const dispatchScene = useCallback((event: PipInteractionSceneEvent) => dispatch({ type: 'scene', id: activeId, epoch, event }), [activeId, epoch]);
  const onActorEvent = useCallback((id: ResidentId, event: PipInteractionSceneEvent) => dispatch({ type: 'scene', id, epoch, event }), [epoch]);
  const onTargetChange = useCallback((target: ResidentTarget | null) => {
    setLiveTarget(target);
    dispatch({ type: 'focus', target });
  }, []);
  const onCameraMount = useCallback((node: THREE.Camera | null) => { camera.current = node; }, []);
  const placeResident = useCallback(() => {
    if (interaction.mode !== 'carrying' || interaction.held !== 'pip' || !camera.current) return;
    const recorded = interaction.lastSafePosition;
    if (!recorded) return;
    const requested = projectPipPlacement(camera.current.position, camera.current.getWorldDirection(new THREE.Vector3()));
    const result = resolvePipPlacement(requested, { x: recorded[0], z: recorded[2] }, community.obstacles(activeId));
    community.reservePlacement(activeId, result.point);
    dispatchScene({ type: 'place-pip', point: result.point, message: result.message });
  }, [interaction, dispatchScene, community, activeId]);
  const placeObject = useCallback((target: GardenObjectId) => {
    if (interaction.mode !== 'carrying' || interaction.held !== target || !camera.current || !interaction.lastSafePosition) return;
    const recorded = interaction.lastSafePosition;
    const requested = projectPipPlacement(camera.current.position, camera.current.getWorldDirection(new THREE.Vector3()));
    const result = resolveGardenObjectPlacement(target, requested, { x: recorded[0], z: recorded[2] }, community.obstacles(null));
    if (target === 'toy') community.placeToy(result.point);
    dispatchScene({ type: 'place-object', target, point: result.point, message: result.message });
  }, [interaction, dispatchScene, community]);
  const placeHeld = useCallback(() => {
    if (interaction.held === 'pip') placeResident();
    else if (interaction.held) placeObject(interaction.held);
  }, [interaction.held, placeObject, placeResident]);
  const activate = useCallback(() => {
    if (journey.comparing) return;
    if (interaction.mode === 'carrying') {
      if (interaction.held === 'pip') return placeResident();
      if (isResidentId(liveTarget)) {
        if (!camera.current || !refs[liveTarget].current || priorities[liveTarget]) return;
        const point = projectGardenObjectOffer(camera.current.position, camera.current.getWorldDirection(new THREE.Vector3()), community.obstacles(null));
        if (interaction.held === 'toy') community.placeToy(point);
        dispatch({ type: 'offer', id: liveTarget, target: interaction.held, point, available: true });
        return;
      }
      return placeObject(interaction.held);
    }
    if (player.focus !== eligibleTarget) return;
    const object = isResidentId(eligibleTarget) ? refs[eligibleTarget].current
      : eligibleTarget === 'food' ? food.current : eligibleTarget === 'toy' ? toy.current : null;
    const safePoint = object ? nearestSafePoint({ x: object.position.x, z: object.position.z }, GARDEN_OBSTACLES) : null;
    const position = safePoint && object ? captureGardenLocalPosition(object.position, safePoint) : null;
    const event = actionEventForLiveTarget(interaction, canonicalTarget(eligibleTarget), position);
    if (event) dispatch({ type: 'activate', event });
  }, [journey.comparing, interaction, liveTarget, eligibleTarget, player.focus, refs, priorities, placeObject, placeResident, community]);

  useEffect(() => {
    if (phase !== 'greet-approach' && !(phase === 'playing' && !toyNudged)) return;
    const timer = window.setTimeout(() => dispatch({ type: 'cancel', id: activeId, epoch }), 12000);
    return () => window.clearTimeout(timer);
  }, [phase, activeId, epoch, toyNudged]);
  useEffect(() => {
    const delay = phase === 'greet' && greetingArrived ? PIP_DIRECT_GREET_REACTION_SECONDS * 1000
      : phase === 'pet' ? PIP_PET_REACTION_SECONDS * 1000
      : phase === 'placed' ? 350
      : phase === 'eating' ? PIP_EATING_REACTION_SECONDS * 1000
      : phase === 'playing' && toyNudged ? PIP_PLAYING_REACTION_SECONDS * 1000 : null;
    if (delay === null) return;
    const type = phase === 'greet' ? 'greet-complete' : phase === 'pet' ? 'pet-complete'
      : phase === 'placed' ? 'placed-complete' : 'object-reaction-complete';
    return schedulePipSceneEvent(dispatchScene, { type }, delay, window.setTimeout, window.clearTimeout);
  }, [phase, greetingArrived, toyNudged, dispatchScene]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { handleHeldInteractionEscape(event, interaction.held, placeHeld); };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [interaction.held, placeHeld]);

  const registrations = useMemo<readonly InteractionTargetRegistration[]>(() => [
    ...roster.filter(r => !(interaction.held === 'pip' && r.id === activeId)).map(r => ({ target: r.id, ref: refs[r.id], maxDistance: 3.2 })),
    ...(interaction.held === 'food' ? [] : [{ target: 'food' as const, ref: food }]),
    ...(interaction.held === 'toy' ? [] : [{ target: 'toy' as const, ref: toy }]),
  ], [roster, interaction.held, activeId, refs]);
  const interests = useMemo(() => selectCurrentGardenInterests(gardenInterestDefinitions, { seedVisible, destinationVisible: destinationVisible !== null }), [seedVisible, destinationVisible]);
  return <div className="world-wrap">
    <Canvas frameloop="demand" shadows="percentage" camera={{ fov: 68, near: .1, far: 120 }}
      dpr={[GARDEN_RENDER_QUALITY.minimumDpr, GARDEN_RENDER_QUALITY.maximumDpr]}
      gl={{ antialias: GARDEN_RENDER_QUALITY.antialias, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = .98; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
      <FrameCadence />
      <CommunityCoordinator community={community} roster={roster} actors={refs} player={player} focused={eligibleTarget}
        priorities={priorities} comparing={journey.comparing} reducedMotion={reducedMotion}
        project={project} projection={projection} activated={activated} onActivities={onActivities} epoch={projectMount.acknowledgedEpoch(projectEpoch)} onProjectEvents={emitProjectEvents} />
      <PlanterProjectScene community={community} progress={projection} />
      <GardenEnvironment journey={journey} rewardStage={rewardStage} starflowersVisible={starflowersVisible} pavilionImproved={pavilionImproved}
        seedVisible={seedVisible} destinationVisible={destinationVisible} reducedMotion={reducedMotion} />
      <GardenSnack ref={food} position={objectPositions.food} carried={interaction.held === 'food'} />
      <GardenToy ref={toy} position={objectPositions.toy} carried={interaction.held === 'toy'} nudged={toyNudged} community={community} />
      {roster.map(resident => <ResidentSlot key={resident.id} resident={resident} journey={journey} onMount={onResidentMount} player={player}
        rewardStage={rewardStage} gardenChoice={gardenChoice} interests={interests} reducedMotion={reducedMotion}
        focused={eligibleTarget} community={community} onMessage={onMessage} onPriority={onPriority} onEvent={onActorEvent} />)}
      <FirstPersonControls movement={movement} speed={employeeWalkSpeedWhileHolding(interaction.held)} onCameraMount={onCameraMount} findRequest={findRequest} residents={refs} community={community} />
      <InteractionTargetTracker registrations={registrations} onTargetChange={onTargetChange} republishSequence={scene.focusRepublishSequence} />
    </Canvas>
    <div className={interactionReticleClassName(label)} aria-hidden="true" />
    <InteractionPrompt label={label} onActivate={activate} />
    {!journey.comparing && visibleMessage && <div className="pip-presence visible" role="status" aria-live="polite" aria-label={speaker.name + ': ' + visibleMessage}>
      <span aria-hidden="true" className="resident-initial" style={{ backgroundColor: speaker.appearance.body }}>{speaker.name[0]}</span>
      <span aria-hidden="true"><strong>{speaker.name}</strong>{' '}{visibleMessage}</span>
    </div>}
    <div className="world-instructions"><strong>Walk the grove</strong><span>WASD or arrow keys · drag to look</span></div>
    <div className="world-pad" aria-label="First-person movement controls">
      {[['arrowup', '↑', 'Walk forward'], ['arrowleft', '←', 'Step left'], ['arrowdown', '↓', 'Step backward'], ['arrowright', '→', 'Step right']].map(([key, text, ariaLabel]) =>
        <button key={key} type="button" className={'world-' + key} aria-label={ariaLabel}
          onPointerDown={() => movement.current.add(key)} onPointerUp={() => movement.current.delete(key)}
          onPointerLeave={() => movement.current.delete(key)} onPointerCancel={() => movement.current.delete(key)}>{text}</button>)}
    </div>
  </div>;
}

function GardenEnvironment(props: { journey: WorldJourney; rewardStage: number; starflowersVisible: boolean; pavilionImproved: boolean;
  seedVisible: boolean; destinationVisible: GardenChoice | null; reducedMotion: boolean }) {
  const grassTexture = useGrassTexture();
  const { journey, ...environment } = props;
  return <StorybookGardenEnvironment {...environment} visit={journey.sceneVisit} settledRewards={journey.visit > 1 || journey.comparing} grassTexture={grassTexture} />;
}
