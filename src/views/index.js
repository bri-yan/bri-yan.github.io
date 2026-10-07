import { MAX_VIEW_OBJECTS } from '../config';

// The forms study stands on one ground height; the cone rests on the block.
const GROUND = -1.4;
const BLOCK_HEIGHT = 1.1;

/**
 * The selectable views: one object, or a composition of several. Each object is
 * a registered watercolor subject; its `id` is unique across all views, so
 * settings can be keyed by it. `size` is the shape's longest side in world
 * units (see shapes.js): about 3.8 gives the knot's footprint, half the short
 * side at the default camera distance. A box or prism also takes `proportions`
 * (and a prism its `sides`). With `rest`, the y of `position` is the height of the object's lowest point, not
 * its center, so a stack is written as the surfaces it stands on. `camera` is the view's framing, in
 * degrees around the origin at the default distance (so the paper scale never
 * changes); it defaults to straight on.
 */
export const VIEWS = [
  {
    id: 'torus-knot',
    label: 'torus knot',
    objects: [{ id: 'torus-knot', shape: 'torus-knot', size: 3.8 }],
  },
  {
    id: 'sphere',
    label: 'sphere',
    objects: [{ id: 'sphere', shape: 'sphere', size: 3 }],
  },
  {
    id: 'cube',
    label: 'cube',
    objects: [{ id: 'cube', shape: 'box', size: 2.2, rotation: [0.55, 0.75, 0] }],
  },
  {
    id: 'icosahedron',
    label: 'icosahedron',
    objects: [{ id: 'icosahedron', shape: 'icosahedron', size: 3.4, rotation: [0.3, 0.5, 0] }],
  },
  {
    id: 'torus',
    label: 'torus',
    objects: [{ id: 'torus', shape: 'torus', size: 3.8, rotation: [1, 0.3, 0] }],
  },
  {
    id: 'teapot',
    label: 'teapot',
    camera: { azimuth: -35, elevation: 12 },
    objects: [{ id: 'teapot', shape: 'teapot', size: 4.4 }],
  },
  {
    // The classic study of forms: a tall hexagonal prism on the left, a cone on
    // a low block on the right, the sphere centered on the ground, and an
    // icosahedron in front. Nothing touches the sphere in 3D: at the default
    // camera it overlaps the block, which stands behind it, and leaves a small
    // gap to the prism. (`sides: 64` would make the prism a cylinder.)
    id: 'forms-study',
    label: 'forms study',
    camera: { elevation: 26 },
    objects: [
      { id: 'forms-study.prism', shape: 'prism', size: 3.1, sides: 6, proportions: [1.5, 3.1], rest: true, position: [-1.85, GROUND, -0.55], rotation: [0, 0.64, 0] },
      { id: 'forms-study.sphere', shape: 'sphere', size: 1.7, rest: true, position: [0, GROUND, -0.1] },
      { id: 'forms-study.block', shape: 'box', size: 1.9, proportions: [1.9, BLOCK_HEIGHT, 1.5], rest: true, position: [1.95, GROUND, -1.2], rotation: [0, -0.45, 0] },
      { id: 'forms-study.cone', shape: 'cone', size: 1.7, rest: true, position: [1.85, GROUND + BLOCK_HEIGHT, -1.2] },
      // Face down, spun a little about the vertical.
      { id: 'forms-study.icosahedron', shape: 'icosahedron', size: 1.25, rest: true, position: [-0.85, GROUND, 1], rotation: [1.8929, 0.9164, 0.3873] },
    ],
  },
];

export const DEFAULT_VIEW = VIEWS[0];
export const DEFAULT_VIEW_ID = DEFAULT_VIEW.id;
/** Label to id, in the order Leva's select lists them. */
export const VIEW_OPTIONS = Object.fromEntries(VIEWS.map(({ label, id }) => [label, id]));

export const getView = (id) => VIEWS.find((view) => view.id === id);

if (import.meta.env.DEV) {
  for (const { id, objects } of VIEWS) {
    if (objects.length > MAX_VIEW_OBJECTS) {
      console.warn(`View "${id}" has ${objects.length} objects; the limit is ${MAX_VIEW_OBJECTS}.`);
    }
  }
}
