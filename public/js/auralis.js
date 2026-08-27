/* ONYX — auralis.js
   WebGL ambient background (layered simplex noise + glow + film grain) behind
   the CTA banner. Vanilla adaptation of the React "Auralis" component; the
   GLSL shaders are reused verbatim. Falls back to the CSS gradient when WebGL
   is unavailable or prefers-reduced-motion is set. Pauses when off-screen. */
(function () {
  'use strict';

  const canvas = document.getElementById('ctaCanvas');
  if (!canvas) return;

  const container = canvas.parentElement;
  if (!container) return;

  // Reduced motion: leave the CSS gradient in place, don't run the shader.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl', { antialias: true });
  if (!gl) return; // no WebGL -> CSS gradient fallback

  // --- tuning (ONYX gold instead of the default red) ---
  const colors = ['#c9a84c', '#d8b65a', '#2a2410'];
  const speed = 0.3;
  const grain = 0.5;

  const vertexShaderGLSL = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const fragmentShaderGLSL = `
precision highp float;
varying vec2 vUv;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_grain;
uniform vec3  u_colors[3];

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / u_resolution.y;
  vec2 p = uv * vec2(ratio, 1.0);
  float t = u_time * 0.2;

  float n1 = snoise(p * 0.5 + t);
  float n2 = snoise(p * 0.9 - t * 0.5 + n1);

  float light = pow(abs(n2), 2.5) * 0.5;

  vec3 col = vec3(0.02, 0.01, 0.01);

  col += u_colors[0] * smoothstep(0.1, 1.0, n1) * 0.5;
  col += u_colors[1] * light;

  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.5;

  float dist = length(uv - 0.5);
  col *= smoothstep(1.2, 0.2, dist);

  gl_FragColor = vec4(col, 1.0);
}`;

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  };

  const createShader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };

  const program = gl.createProgram();
  gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderGLSL));
  gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderGLSL));
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const pos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const locs = {
    res: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
    grain: gl.getUniformLocation(program, 'u_grain'),
    colors: gl.getUniformLocation(program, 'u_colors')
  };

  const flatColors = new Float32Array(colors.slice(0, 3).flatMap(hexToRgb));

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, container.clientWidth * dpr);
    canvas.height = Math.max(1, container.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let raf = null;
  let running = false;

  const render = (t) => {
    gl.uniform2f(locs.res, canvas.width, canvas.height);
    gl.uniform1f(locs.time, t * 0.001 * speed);
    gl.uniform1f(locs.grain, grain);
    gl.uniform3fv(locs.colors, flatColors);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(render);
  };

  const start = () => {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(render);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  };

  // Only animate while the CTA banner is on screen.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries[0].isIntersecting ? start() : stop();
      },
      { threshold: 0.01 }
    );
    io.observe(container);
  } else {
    start();
  }

  // Pause when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });
})();
