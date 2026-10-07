import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWatercolorSubject } from '../pipeline/WatercolorSubjects';
import { createShapeGeometry } from '../views/shapes';

const ORIGIN = [0, 0, 0];

/** The lowest y of a geometry once rotated, so a tilted shape can rest on a surface. */
function lowestPoint(geometry, rotation) {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
  const vertex = new THREE.Vector3();
  const { position } = geometry.attributes;
  let lowest = Infinity;
  for (let i = 0; i < position.count; i++) {
    lowest = Math.min(lowest, vertex.fromBufferAttribute(position, i).applyQuaternion(quaternion).y);
  }
  return lowest;
}

function ViewObject({ id, shape, size, proportions, sides, rest = false, position = ORIGIN, rotation = ORIGIN }) {
  const meshRef = useRef();
  useWatercolorSubject(meshRef, id);
  const geometry = useMemo(
    () => createShapeGeometry(shape, size, { proportions, sides }),
    [shape, size, proportions, sides]
  );
  // With `rest`, the y of `position` is where the object's lowest point sits,
  // not its center, so a stack is described by the surfaces it stands on.
  const placed = useMemo(
    () => (rest ? [position[0], position[1] - lowestPoint(geometry, rotation), position[2]] : position),
    [geometry, position, rest, rotation]
  );

  return (
    <mesh ref={meshRef} geometry={geometry} position={placed} rotation={rotation}>
      <meshBasicMaterial color="#00ffff" />
    </mesh>
  );
}

/**
 * The objects of one view, each a registered watercolor subject. Mount it with
 * the view's id as its `key`, so switching views is a clean remount and only
 * the active view's objects exist.
 */
export function ViewScene({ view }) {
  return view.objects.map((object) => <ViewObject key={object.id} {...object} />);
}
