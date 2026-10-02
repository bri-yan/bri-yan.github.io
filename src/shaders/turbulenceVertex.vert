// Object-local position, so the turbulence rides with the mesh under any
// camera or object motion.
varying vec3 vLocalPosition;

void main() {
  vLocalPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
