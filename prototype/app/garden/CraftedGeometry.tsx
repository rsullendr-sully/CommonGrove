'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createSoftBoxGeometry } from './gardenCraft';

/** Component owns its generated geometry; shared scene geometry stays untouched. */
export function SoftBoxGeometry({ args }: { args: readonly [number, number, number] }) {
  const [width, height, depth] = args;
  const geometry = useMemo(() => createSoftBoxGeometry(width, height, depth), [width, height, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

/** A restrained colored wash lets the existing grain read as worked timber, not orange plastic. */
export function CraftedWoodMaterial({ map, color = '#c5aa82' }: { map: THREE.Texture; color?: string }) {
  const material = useMemo(() => {
    const finish = new THREE.MeshStandardMaterial({ map, roughness: .96, bumpMap: map, bumpScale: .012 });
    finish.onBeforeCompile = (shader) => {
      shader.uniforms.craftWoodColor = { value: new THREE.Color(color) };
      shader.fragmentShader = 'uniform vec3 craftWoodColor;\n' + shader.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\n diffuseColor.rgb = mix(craftWoodColor, diffuseColor.rgb, 0.2);',
      );
    };
    finish.customProgramCacheKey = () => 'crafted-wood-v1';
    return finish;
  }, [map, color]);
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}
