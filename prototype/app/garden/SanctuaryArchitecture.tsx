'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCliffGeometry, createPavilionRoofGeometry, pavilionRoofHeight } from './sanctuaryGeometry';
import { getGardenElevation } from './gardenElevation';
import CraftedTree from './CraftedTree';

const CLIFF_GEOMETRIES = [3, 7, 11, 19].map(createCliffGeometry);
const ROOF_GEOMETRY = createPavilionRoofGeometry();
const STONE_COLORS = ['#f3e5c8', '#e5d5b7', '#eee1c4', '#d8cfb6'];
const ROOF_MATERIAL = new THREE.MeshStandardMaterial({ color: '#3d858a', roughness: .82, side: THREE.DoubleSide });
const MOSS_MATERIAL = new THREE.MeshStandardMaterial({ color: '#799547', roughness: 1 });

// Solid faces remain inside the existing spring exclusion. No new hidden colliders.
const CLIFF_COLUMNS = [
  { x: -4, z: -14.8, width: 3.2, depth: 3.9, height: 8.2 },
  { x: -.9, z: -15.6, width: 3.8, depth: 5.4, height: 11.4 },
  { x: 2.4, z: -15.8, width: 3.5, depth: 4.8, height: 10.3 },
  { x: 4.4, z: -14, width: 2.6, depth: 3.4, height: 7.1 },
  { x: -.1, z: -11.9, width: 4.6, depth: 3.2, height: 6.2 },
];

function VineSprays({ x, y, z, seed }: { x: number; y: number; z: number; seed: number }) {
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: 12 }, (_, index) => {
        const row = Math.floor(index / 2);
        return <mesh key={index} position={[Math.sin(row * .8 + seed) * .15 + (index % 2 ? .14 : -.14), -row * .19, .02]} rotation={[.5, index * .8, index % 2 ? -.45 : .45]} scale={[.2, .055, .12]} material={MOSS_MATERIAL}><sphereGeometry args={[1, 6, 4]} /></mesh>;
      })}
    </group>
  );
}

export function SculptedCliffs({ limestoneTexture }: { limestoneTexture: THREE.Texture }) {
  return (
    <group>
      {CLIFF_COLUMNS.map((column, columnIndex) => (
        <group key={columnIndex}>
          {Array.from({ length: 5 }, (_, course) => {
            const height = column.height / 5;
            const width = column.width * (1 - course * .045);
            return (
              <group key={course} position={[column.x + Math.sin(course * 1.5 + columnIndex) * .18, height * (course + .5) - .15, column.z]}>
                <mesh geometry={CLIFF_GEOMETRIES[(course + columnIndex) % 4]} scale={[width, height + .18, column.depth * (1 - course * .025)]} rotation={[0, Math.sin(course + columnIndex) * .06, 0]} castShadow receiveShadow dispose={null}>
                  <meshStandardMaterial map={limestoneTexture} bumpMap={limestoneTexture} bumpScale={.055} color={STONE_COLORS[(course + columnIndex) % 4]} roughness={.96} />
                </mesh>
                {(course + columnIndex) % 2 === 0 && <VineSprays x={width * .25} y={height * .44} z={column.depth * .5} seed={course + columnIndex} />}
              </group>
            );
          })}
          <mesh position={[column.x, column.height - .15, column.z]} scale={[column.width * .84, .16, column.depth * .78]} geometry={CLIFF_GEOMETRIES[columnIndex % 4]} material={MOSS_MATERIAL} dispose={null} />
        </group>
      ))}
      <CraftedTree position={[-1.2, 11.25, -15.5]} seed={43} scale={.48} />
      <CraftedTree position={[3.2, 10.15, -16]} seed={57} scale={.37} />
    </group>
  );
}

const WATERFALL_VERTEX = `varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const WATERFALL_FRAGMENT = `uniform float time; uniform float glow; varying vec2 vUv;
void main(){
 float strands=sin(vUv.x*87.+sin(vUv.y*12.+time*2.)*.8)*.5+.5;
 float fine=pow(sin(vUv.x*171.+vUv.y*7.-time*4.)*.5+.5,8.);
 float travel=sin(vUv.y*44.+time*9.+sin(vUv.x*22.))* .5+.5;
 float edge=smoothstep(0.,.09,vUv.x)*smoothstep(0.,.09,1.-vUv.x);
 vec3 col=mix(vec3(.11,.48,.58),vec3(.78,.94,.91),strands*.45+fine*.45+travel*.12);
 col+=glow*.025;
 gl_FragColor=vec4(col,edge*(.75+fine*.2));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function ArchedSpring({ limestoneTexture, reducedMotion, glow }: { limestoneTexture: THREE.Texture; reducedMotion: boolean; glow: number }) {
  const waterfall = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, glow: { value: glow } }), [glow]);
  useFrame(({ clock }) => {
    if (waterfall.current) waterfall.current.uniforms.time.value = reducedMotion ? 0 : clock.elapsedTime;
  });
  return (
    <group position={[0, 0, -8.8]}>
      <mesh position={[0, 2.1, -.34]}><planeGeometry args={[3.05, 4.2]} /><meshStandardMaterial color="#344f4d" roughness={1} /></mesh>
      {[-1.63, 1.63].map((x) => [0, 1, 2].map((course) => (
        <mesh key={`${x}-${course}`} position={[x, .43 + course * .79, -.05]} geometry={CLIFF_GEOMETRIES[course]} scale={[.7, .82, 1.25]} castShadow receiveShadow dispose={null}>
          <meshStandardMaterial map={limestoneTexture} color="#f1dfb8" roughness={.9} bumpMap={limestoneTexture} bumpScale={.035} />
        </mesh>
      )))}
      {Array.from({ length: 13 }, (_, index) => {
        const a = Math.PI * index / 12;
        return <mesh key={index} position={[Math.cos(a) * 1.63, 2.36 + Math.sin(a) * 1.63, -.05]} rotation={[0, 0, a - Math.PI / 2]} geometry={CLIFF_GEOMETRIES[index % 4]} scale={[.44, .73, 1.28]} castShadow receiveShadow dispose={null}><meshStandardMaterial map={limestoneTexture} color={index === 6 ? '#fff0cc' : '#e7d7b6'} bumpMap={limestoneTexture} bumpScale={.03} roughness={.91} /></mesh>;
      })}
      <mesh position={[0, 2.3, .07]} castShadow><boxGeometry args={[2.56, .16, .55]} /><meshStandardMaterial map={limestoneTexture} color="#d6caab" roughness={.9} /></mesh>
      <mesh position={[0, 1.17, .3]}>
        <planeGeometry args={[2.4, 2.23, 1, 1]} />
        <shaderMaterial ref={waterfall} vertexShader={WATERFALL_VERTEX} fragmentShader={WATERFALL_FRAGMENT} uniforms={uniforms} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, .06, 1.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.35, 3.6]} /><meshPhysicalMaterial color="#58bfc5" roughness={.18} clearcoat={1} /></mesh>
      {[0, 1, 2].map((index) => <mesh key={index} position={[0, .08 + index * .008, .44 + index * .26]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.25 + index * .15, .32, 1]}><ringGeometry args={[.72, .82, 40]} /><meshBasicMaterial color="#e1f8ed" transparent opacity={.24 - index * .05} depthWrite={false} /></mesh>)}
      <VineSprays x={-1.9} y={3.6} z={.65} seed={3} />
      <VineSprays x={1.7} y={2.3} z={.65} seed={7} />
    </group>
  );
}

export function PavilionRoof({ woodTexture }: { woodTexture: THREE.Texture }) {
  const seams = useMemo(() => {
    const curves: THREE.BufferGeometry[] = [];
    // Narrow rounded seams and overlapping courses give the roof a tile-like surface.
    for (let x = -3; x <= 3.01; x += .3) {
      const points = Array.from({ length: 33 }, (_, i) => {
        const z = -3.15 + i / 32 * 6.3;
        return new THREE.Vector3(x, pavilionRoofHeight(x, z) + .025, z);
      });
      curves.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .022, 5, false));
    }
    for (let z = -2.8; z <= 2.81; z += .4) {
      const points = Array.from({ length: 33 }, (_, i) => {
        const x = -3.15 + i / 32 * 6.3;
        return new THREE.Vector3(x, pavilionRoofHeight(x, z) + .012, z);
      });
      curves.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .012, 4, false));
    }
    return curves;
  }, []);
  useEffect(() => () => seams.forEach((geometry) => geometry.dispose()), [seams]);
  return (
    <group>
      <mesh geometry={ROOF_GEOMETRY} material={ROOF_MATERIAL} castShadow receiveShadow dispose={null} />
      {seams.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={index < 21 ? '#509396' : '#317075'} roughness={.88} /></mesh>)}
      {[-1, 1].map((side) => <group key={side}>
        <mesh position={[0, 3.62, side * 2.88]} castShadow><boxGeometry args={[6.25, .22, .19]} /><meshStandardMaterial map={woodTexture} color="#dcc08f" roughness={.88} /></mesh>
        <mesh position={[side * 2.88, 3.62, 0]} castShadow><boxGeometry args={[.19, .22, 5.75]} /><meshStandardMaterial map={woodTexture} color="#dcc08f" roughness={.88} /></mesh>
        <mesh position={[0, 3.47, side * 2]} castShadow><boxGeometry args={[4.6, .2, .25]} /><meshStandardMaterial map={woodTexture} color="#c5a075" roughness={.9} /></mesh>
        <mesh position={[side * 2, 3.47, 0]} castShadow><boxGeometry args={[.25, .2, 4.6]} /><meshStandardMaterial map={woodTexture} color="#c5a075" roughness={.9} /></mesh>
      </group>)}
      <mesh position={[0, 4.98, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.1, .1, 2.25, 10]} /><meshStandardMaterial color="#bbad7e" roughness={.85} /></mesh>
    </group>
  );
}

function createPavingTile(x: number, z: number, width: number, depth: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, 2, 2).rotateX(-Math.PI / 2).translate(x, 0, z);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) position.setY(i, getGardenElevation(position.getX(i), position.getZ(i)) + .018);
  geometry.computeVertexNormals();
  return geometry;
}

export function ReadingApproach({ limestoneTexture }: { limestoneTexture: THREE.Texture }) {
  const tiles = useMemo(() => Array.from({ length: 14 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => createPavingTile(-12.2 + (column - 1.5) * .63, -3.15 - row * .55, .607, .528)),
  ).flat(), []);
  useEffect(() => () => tiles.forEach((geometry) => geometry.dispose()), [tiles]);
  return <group>{tiles.map((geometry, index) => <mesh key={index} geometry={geometry} receiveShadow><meshStandardMaterial map={limestoneTexture} color={STONE_COLORS[index % 4]} bumpMap={limestoneTexture} bumpScale={.018} roughness={.96} /></mesh>)}</group>;
}
