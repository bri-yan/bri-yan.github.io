// Draws to screen every rendered frame: the finished painting, copied, with
// the cursor on top. Only pixels within the cursor's reach do any more work.
// paperSlope / tSubstrate come from chunks/paperSlope.glsl, prepended by the pass.

uniform sampler2D tPainting;
uniform bool uCursorVisible;
uniform vec2 uCursorPosition; // device pixels, gl_FragCoord's frame
uniform float uCursorRadius; // device pixels, to the middle of the line
uniform float uCursorLineWidth; // device pixels
uniform float uCursorDistortion; // device pixels of shift per unit slope
uniform float uCursorReach; // device pixels beyond which nothing of the cursor can show

// Near-black with the warmth of the plates' ink.
const vec3 CURSOR_INK = vec3(0.05, 0.045, 0.04);

varying vec2 vUv;

void main() {
  vec3 color = texture2D(tPainting, vUv).rgb;

  // Cursor: a window onto the bare substrate, ringed in ink. The ring is a
  // perfect circle nudged by the paper slope like the paint, while the paper
  // seen through it is read undistorted, so the tooth stays put as it passes.
  vec2 toCursor = gl_FragCoord.xy - uCursorPosition;
  if (uCursorVisible && dot(toCursor, toCursor) < uCursorReach * uCursorReach) {
    vec2 fromCursor = toCursor * vec2(1.0, -1.0) + uCursorDistortion * paperSlope(vUv);
    float radius = length(fromCursor);
    float inside = 1.0 - smoothstep(uCursorRadius - 0.5, uCursorRadius + 0.5, radius);
    color = mix(color, texture2D(tSubstrate, vUv).rgb, inside);
    float ring = 1.0 - smoothstep(-0.5, 0.5, abs(radius - uCursorRadius) - 0.5 * uCursorLineWidth);
    color = mix(color, CURSOR_INK, ring);
  }

  gl_FragColor = vec4(color, 1.0);
}
