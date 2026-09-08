'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createBranchGeometry, createTreeCrown } from './sanctuaryGeometry';
import { createSoftGardenCrown, createSoftLeafGeometry } from './gardenCraft';

const LEAF_GEOMETRY = new THREE.BufferGeometry();
LEAF_GEOMETRY.setAttribute('position', new THREE.Float32BufferAttribute([
  -.55, 0, 0, 0, -.04, .23, .55, 0, 0, 0, -.04, -.23, 0, .09, 0,
], 3));
LEAF_GEOMETRY.setIndex([0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0]);
LEAF_GEOMETRY.computeVertexNormals();
const LEAF_MATERIAL = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .96, side: THREE.DoubleSide });
const BARK_MATERIAL = new THREE.MeshStandardMaterial({ color: '#8e7047', roughness: 1 });
const LEAF_COLORS = ['#55832d', '#689538', '#83a944', '#477830', '#96b950'].map((color) => new THREE.Color(color));
const SOFT_LEAF_GEOMETRY = createSoftLeafGeometry();
const SOFT_LEAF_COLORS = ['#879952', '#9ba85c', '#b3b876', '#758a4d', '#a4ae66'].map((color) => new THREE.Color(color));

export default function CraftedTree({ position, seed = 13, scale = 1, finish = 'original', woodTexture, grainTexture }: { position: [number, number, number]; seed?: number; scale?: number; finish?: 'original' | 'soft'; woodTexture?: THREE.Texture; grainTexture?: THREE.Texture }) {
  const leaves = useRef<THREE.InstancedMesh>(null);
  // Cliff-top trees retain the approved original finish by default.
  const soft = finish === 'soft';
  const crown = useMemo(() => soft ? createSoftGardenCrown(seed) : createTreeCrown(seed), [seed, soft]);
  const finishes = useMemo(() => ({
    leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .97, bumpMap: grainTexture, bumpScale: .012 }),
    bark: new THREE.MeshStandardMaterial({ color: '#a58d67', bumpMap: woodTexture, bumpScale: .025, roughness: .96 }),
  }), [woodTexture, grainTexture]);
  useEffect(() => () => { finishes.leaf.dispose(); finishes.bark.dispose(); }, [finishes]);
  const branches = useMemo(() => [
    createBranchGeometry([[0, 0, 0], [.22, 1.4, .1], [-.16, 3.1, -.05], [.12, 5, 0]], .42),
    ...crown.branches.map((branch) => createBranchGeometry([branch.start, branch.middle, branch.end], branch.radius)),
    ...Array.from({ length: 5 }, (_, index) => {
      const a = index * Math.PI * .4;
      return createBranchGeometry([[Math.cos(a) * .65, .06, Math.sin(a) * .65], [Math.cos(a) * .28, .24, Math.sin(a) * .28], [0, .65, 0]], .15);
    }),
  ], [crown]);

  useEffect(() => () => branches.forEach((geometry) => geometry.dispose()), [branches]);
  useLayoutEffect(() => {
    if (!leaves.current) return;
    const transform = new THREE.Object3D();
    crown.leaves.forEach((leaf, index) => {
      transform.position.set(...leaf.position);
      transform.rotation.set(...leaf.rotation);
      transform.scale.setScalar(leaf.scale);
      transform.updateMatrix();
      leaves.current!.setMatrixAt(index, transform.matrix);
      leaves.current!.setColorAt(index, (soft ? SOFT_LEAF_COLORS : LEAF_COLORS)[leaf.color]);
    });
    leaves.current.instanceMatrix.needsUpdate = true;
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true;
    leaves.current.computeBoundingSphere();
  }, [crown, soft]);

  return (
    <group position={position} scale={scale} dispose={null}>
      {branches.map((geometry, index) => <mesh key={index} geometry={geometry} material={soft ? finishes.bark : BARK_MATERIAL} castShadow receiveShadow />)}
      <instancedMesh ref={leaves} args={[soft ? SOFT_LEAF_GEOMETRY : LEAF_GEOMETRY, soft ? finishes.leaf : LEAF_MATERIAL, crown.leaves.length]} castShadow receiveShadow />
    </group>
  );
}
