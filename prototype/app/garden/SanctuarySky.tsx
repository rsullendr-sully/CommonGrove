'use client';

import * as THREE from 'three';
import { createSanctuarySkyGeometry } from './sanctuaryGeometry';

const GEOMETRY = createSanctuarySkyGeometry();
const MATERIAL = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 direction; void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec3 direction; void main(){
    float h=max(0.,normalize(direction).y);
    vec3 horizon=vec3(.72,.85,.78);
    vec3 zenith=vec3(.14,.48,.76);
    vec3 c=mix(horizon,zenith,pow(h,.4));
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});

export default function SanctuarySky() {
  return <mesh geometry={GEOMETRY} material={MATERIAL} renderOrder={-100} dispose={null} />;
}
