import * as THREE from 'three';
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js';

// The knot's curve reaches 1.5 radii from its axis and its tube is 0.4 radii
// thick, so its widest extent is 3.8 radii.
const KNOT_EXTENT = 3.8;
const KNOT_TUBE_RATIO = 0.4;
// The torus tube is this share of its outer radius.
const TORUS_TUBE_RATIO = 0.29;
// A cone's base radius, as a share of its height.
const CONE_RADIUS_RATIO = 0.37;
// A prism with more sides than this is left smooth: a cylinder.
const MAX_FACETED_SIDES = 12;

/** Centers a geometry on the origin and scales it so its longest side is `size`. */
function fitGeometry(geometry, size) {
  geometry.center();
  geometry.computeBoundingBox();
  const extent = geometry.boundingBox.getSize(new THREE.Vector3());
  const scale = size / Math.max(extent.x, extent.y, extent.z);
  return geometry.scale(scale, scale, scale);
}

/** Gives every face its own normal, so a low-sided prism reads as flat facets. */
function facet(geometry) {
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  geometry.dispose();
  return faceted;
}

// Each factory builds its shape centered on the origin, `size` world units
// across: the diameter of a sphere (or of an icosahedron's circumscribed
// sphere), the height of a cone, and the longest side of a box or prism.
// Sizing happens in the geometry, never on the mesh: pigment turbulence is
// evaluated at the geometry's local position, so a mesh scaled afterward would
// mottle at a different frequency. A box takes `proportions` ([x, y, z],
// relative lengths) for the bricks and slabs of a composition; a prism takes
// `proportions` ([width across its corners, height]) and its number of `sides`.
const SHAPES = {
  'torus-knot': (size) => {
    const radius = size / KNOT_EXTENT;
    return new THREE.TorusKnotGeometry(radius, radius * KNOT_TUBE_RATIO, 100, 16);
  },
  sphere: (size) => new THREE.SphereGeometry(size / 2, 64, 48),
  box: (size, { proportions = [1, 1, 1] } = {}) => {
    const longest = Math.max(...proportions);
    const [width, height, depth] = proportions.map((side) => (size * side) / longest);
    return new THREE.BoxGeometry(width, height, depth);
  },
  // A regular prism standing on its base: six sides make a hexagonal prism, and
  // many sides a cylinder.
  prism: (size, { proportions = [1, 1], sides = 6 } = {}) => {
    const longest = Math.max(...proportions);
    const [width, height] = proportions.map((side) => (size * side) / longest);
    const geometry = new THREE.CylinderGeometry(width / 2, width / 2, height, sides, 1);
    return sides <= MAX_FACETED_SIDES ? facet(geometry) : geometry;
  },
  // Detail 0 keeps the facets flat.
  icosahedron: (size) => new THREE.IcosahedronGeometry(size / 2, 0),
  torus: (size) => {
    const outer = size / 2;
    const tube = outer * TORUS_TUBE_RATIO;
    return new THREE.TorusGeometry(outer - tube, tube, 48, 96);
  },
  cone: (size) => new THREE.ConeGeometry(size * CONE_RADIUS_RATIO, size, 64, 1),
  teapot: (size) => fitGeometry(new TeapotGeometry(1, 12), size),
};

export function createShapeGeometry(shape, size, options) {
  const create = SHAPES[shape];
  if (!create) throw new Error(`Unknown shape "${shape}".`);
  return create(size, options);
}
