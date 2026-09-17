uniform sampler2D tInput;
uniform int uChannel; // 0 = rgb, 1 = alpha as grayscale, 2 = rgb × alpha
uniform int uMode; // 0 = color, 1 = raw depth, 2 = normalized depth
uniform float uNear;
uniform float uFar;

varying vec2 vUv;

const float CHECKER_CELL_SIZE = 32.0;

void main() {
  vec4 t = texture2D(tInput, vUv);
  vec3 checker = vec3(
    mod(floor(gl_FragCoord.x / CHECKER_CELL_SIZE) + floor(gl_FragCoord.y / CHECKER_CELL_SIZE), 2.0) * 0.125 + 0.125
  );
  if (t.a < 0.5) {
    gl_FragColor = vec4(checker, 1.0);
    return;
  }

  if (uMode == 1) {
    float depth = clamp((t.r - uNear) / max(uFar - uNear, 0.0001), 0.0, 1.0);
    gl_FragColor = vec4(vec3(depth), 1.0);
    return;
  }

  if (uMode == 2) {
    gl_FragColor = vec4(vec3(clamp(t.r, 0.0, 1.0)), 1.0);
    return;
  }

  vec3 c = uChannel == 1 ? vec3(t.a) : uChannel == 2 ? t.rgb * t.a : t.rgb;
  gl_FragColor = vec4(c, 1.0);
}
