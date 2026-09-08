import * as THREE from 'three';

export function createSanctuarySkyGeometry(): THREE.BufferGeometry {
  // Radius plus the farthest garden corner must stay inside the camera's 120 m far plane.
  return new THREE.SphereGeometry(80, 32, 20);
}

export function createCliffGeometry(seed: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 8, 8, 8);
  const positions = geometry.getAttribute('position');
  const point = new THREE.Vector3();
  const inner = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    inner.copy(point).clampScalar(-0.37, 0.37);
    const wear = Math.sin(point.x * 19 + seed) * Math.cos(point.z * 17 - seed) * 0.012;
    point.sub(inner).normalize().multiplyScalar(0.13 + wear).add(inner);
    point.x += Math.sin(point.y * 24 + seed) * 0.014;
    point.z += Math.sin(point.y * 27 + seed * 2) * 0.018;
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Swept, slightly upturned hips; an elongated ridge rather than a four-sided cone. */
export function pavilionRoofHeight(x: number, z: number): number {
  const slope = Math.max(Math.abs(z) / 3.15, Math.max(0, Math.abs(x) - 0.95) / 2.2);
  return 4.95 - 1.4 * Math.sin(Math.min(1, slope) * Math.PI / 2) + 0.18 * Math.pow(slope, 8);
}

export function createPavilionRoofGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(6.3, 6.3, 40, 40).rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, pavilionRoofHeight(positions.getX(i), positions.getZ(i)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

type Point = [number, number, number];
export type CrownLeaf = { position: Point; rotation: Point; scale: number; color: number };
export type CrownBranch = { start: Point; middle: Point; end: Point; radius: number };

export function createTreeCrown(seed: number): { leaves: CrownLeaf[]; branches: CrownBranch[] } {
  let state = Math.max(1, seed);
  const random = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
  const leaves: CrownLeaf[] = [];
  const branches: CrownBranch[] = [];
  for (let cluster = 0; cluster < 18; cluster++) {
    const angle = cluster * 2.39996 + random() * 0.4;
    const radius = 1.2 + random() * 1.8;
    const y = 3.7 + cluster / 18 * 2.4;
    const end: Point = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    branches.push({
      start: [0.12, 1.8 + cluster / 18 * 2.6, 0],
      middle: [end[0] * 0.55, y - 0.55, end[2] * 0.5],
      end, radius: 0.13 - cluster / 18 * 0.065,
    });
    for (let index = 0; index < 145; index++) {
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(random());
      leaves.push({
        position: [end[0] + Math.cos(a) * r * 1.35, y + (random() - 0.5) * 1.1, end[2] + Math.sin(a) * r * 1.25],
        rotation: [(random() - 0.5) * 1.3, random() * Math.PI * 2, (random() - 0.5) * 0.8],
        scale: 0.36 + random() * 0.36,
        color: Math.floor(random() * 5),
      });
    }
  }
  return { leaves, branches };
}

export function createBranchGeometry(points: Point[], radius: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(curve, 12, radius, 7, false);
  const positions = geometry.getAttribute('position');
  const point = new THREE.Vector3();
  for (let ring = 0; ring <= 12; ring++) {
    const center = curve.getPointAt(ring / 12);
    const taper = 1 - ring / 12 * 0.86;
    for (let side = 0; side <= 7; side++) {
      const index = ring * 8 + side;
      point.fromBufferAttribute(positions, index).sub(center).multiplyScalar(taper).add(center);
      positions.setXYZ(index, point.x, point.y, point.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}
