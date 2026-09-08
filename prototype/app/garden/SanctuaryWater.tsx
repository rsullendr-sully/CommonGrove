'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const VERTEX = `varying vec2 surface;
void main(){ surface=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FRAGMENT = `uniform float time; uniform float warmth; varying vec2 surface;
void main(){
 vec2 p=surface;
 float radius=length(p)/5.8;
 float shallow=smoothstep(.5,1.02,radius);
 vec3 deep=vec3(.075,.27,.28);
 vec3 edge=vec3(.32,.57,.4);
 float wave=sin(p.x*5.+p.y*3.+time*.8)+sin(p.x*2.3-p.y*6.-time*.65)*.55;
 vec3 color=mix(deep,edge,shallow);
 color+=vec3(.003,.008,.006)*wave;
 float caustic=pow(max(0.,sin(p.x*9.+sin(p.y*5.+time*.45))*sin(p.y*9.-sin(p.x*4.-time*.4))),12.);
 color+=vec3(.035,.055,.025)*caustic*shallow;
 float glint=pow(max(0.,sin(p.y*18.+wave*.8+time*.4)),30.);
 float reflection=exp(-pow((p.x+1.4+sin(p.y*3.)*.3)/1.6,2.));
 color+=vec3(.025,.045,.035)*glint*reflection;
 color+=warmth*.006;
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export default function SanctuaryWater({ geometry, motion, glow }: { geometry: THREE.BufferGeometry; motion: boolean; glow: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, warmth: { value: glow } }), [glow]);
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.time.value = motion ? clock.elapsedTime : 0;
  });
  return <mesh geometry={geometry} position={[0, .056, 0]} rotation={[-Math.PI / 2, 0, 0]} dispose={null}>
    <shaderMaterial ref={material} vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} />
  </mesh>;
}
