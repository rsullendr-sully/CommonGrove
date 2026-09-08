import * as THREE from 'three';
import { createTreeCrown } from './sanctuaryGeometry';

/** Round inward so furniture keeps its authored footprint and clearance. */
export function createSoftBoxGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, 6, 6, 6);
  const radius = Math.min(width, height, depth) * .2;
  const innerHalf = new THREE.Vector3(width / 2 - radius, height / 2 - radius, depth / 2 - radius);
  const minimum = innerHalf.clone().negate();
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const point = new THREE.Vector3();
  const inner = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    inner.copy(point).clamp(minimum, innerHalf);
    normal.copy(point).sub(inner).normalize();
    point.copy(inner).addScaledVector(normal, radius);
    positions.setXYZ(i, point.x, point.y, point.z);
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  return geometry;
}

export function createSoftLeafGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(1, 12, 8).scale(.55, .085, .25);
}

export function createSoftGardenCrown(seed: number) {
  const crown = createTreeCrown(seed);
  return { ...crown, leaves: crown.leaves.filter((_, index) => index % 3 === 0).map((leaf) => ({
    ...leaf, scale: leaf.scale * 1.24,
  })) };
}

/** Keep existing lawn art, but quiet its high-frequency contrast in the lit material. */
export function createCraftedLawnMaterial(texture: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.craftLawnColor = { value: new THREE.Color('#99ad68') };
    shader.fragmentShader = 'uniform vec3 craftLawnColor;\n' + shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\n diffuseColor.rgb = mix(craftLawnColor, diffuseColor.rgb, 0.22);',
    );
  };
  material.customProgramCacheKey = () => 'crafted-lawn-v1';
  return material;
}
