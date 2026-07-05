/* ==========================================================================
   MUTATION® — Scène Three.js du hero
   Icosaèdre wireframe + points, displacement simplex noise (vertex shader),
   rotation lente + réaction souris avec lerp doux.
   Three.js r160 en module ES via import map (jsDelivr).
   ========================================================================== */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const container = document.getElementById("webgl-container");

function activateFallback() {
  document.body.classList.add("no-webgl");
  if (container) container.style.display = "none";
}

function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch (e) {
    return false;
  }
}

if (prefersReducedMotion || !container || !isWebGLAvailable()) {
  activateFallback();
} else {
  init().catch(activateFallback);
}

async function init() {
  const THREE = await import("three");

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // plafonné à 2
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  /* ---------- Scène & caméra ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    50
  );
  camera.position.set(0, 0, 6);

  /* ---------- Simplex noise 3D (GLSL — Ashima / Ian McEwan, domaine public) ---------- */
  const NOISE_GLSL = /* glsl */ `
    vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+10.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

      vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
  `;

  const VERTEX_HEAD = /* glsl */ `
    uniform float uTime;
    uniform float uDistort;
    ${NOISE_GLSL}
    vec3 displace(vec3 p) {
      float n = snoise(p * 1.35 + vec3(uTime * 0.18));
      return p + normalize(p) * n * (0.28 + uDistort * 0.45);
    }
  `;

  /* ---------- Uniforms partagés ---------- */
  const uniforms = {
    uTime: { value: 0 },
    uDistort: { value: 0 }
  };

  /* ---------- Géométrie : icosaèdre detail 20 → ~4 000 sommets ---------- */
  const geometry = new THREE.IcosahedronGeometry(1.7, 20);

  /* ---------- Mesh wireframe ---------- */
  const wireMaterial = new THREE.ShaderMaterial({
    uniforms,
    wireframe: true,
    transparent: true,
    vertexShader: `
      ${VERTEX_HEAD}
      varying float vNoise;
      void main() {
        vec3 p = displace(position);
        vNoise = length(p) - 1.7;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying float vNoise;
      void main() {
        vec3 base = vec3(0.16, 0.16, 0.20);            // gris sombre
        vec3 acid = vec3(0.8, 1.0, 0.0);               // #CCFF00
        vec3 color = mix(base, acid, smoothstep(0.05, 0.5, vNoise));
        gl_FragColor = vec4(color, 0.55);
      }
    `
  });
  const wireMesh = new THREE.Mesh(geometry, wireMaterial);

  /* ---------- Points par-dessus ---------- */
  const pointsMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      ${VERTEX_HEAD}
      varying float vNoise;
      void main() {
        vec3 p = displace(position);
        vNoise = length(p) - 1.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 2.2 * (4.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vNoise;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        if (dot(uv, uv) > 0.25) discard;
        vec3 acid = vec3(0.8, 1.0, 0.0);
        float a = 0.25 + smoothstep(0.1, 0.5, vNoise) * 0.6;
        gl_FragColor = vec4(acid, a);
      }
    `
  });
  const points = new THREE.Points(geometry, pointsMaterial);

  const group = new THREE.Group();
  group.add(wireMesh);
  group.add(points);
  scene.add(group);

  // Sur mobile : objet centré plus petit ; sur desktop : décalé à droite
  function layout() {
    const isNarrow = container.clientWidth < 768;
    group.position.x = isNarrow ? 0 : 1.6;
    group.position.y = isNarrow ? 0.9 : 0;
    const s = isNarrow ? 0.7 : 1;
    group.scale.setScalar(s);
  }
  layout();

  /* ---------- Souris (lerp doux) ---------- */
  const mouse = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  /* ---------- Resize ---------- */
  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    layout();
  });

  /* ---------- Boucle : pause quand l'onglet est caché ---------- */
  const clock = new THREE.Clock();
  let rafId = null;

  function animate() {
    rafId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Lerp de la souris
    smooth.x += (mouse.x - smooth.x) * 0.04;
    smooth.y += (mouse.y - smooth.y) * 0.04;

    // Rotation lente + inflexion souris
    group.rotation.y = elapsed * 0.12 + smooth.x * 0.55;
    group.rotation.x = Math.sin(elapsed * 0.08) * 0.15 - smooth.y * 0.4;

    // Distorsion liée à l'éloignement de la souris du centre
    const targetDistort = Math.min(1, Math.hypot(smooth.x, smooth.y));
    uniforms.uDistort.value += (targetDistort - uniforms.uDistort.value) * 0.05;
    uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        clock.stop();
      }
    } else if (rafId === null) {
      clock.start();
      animate();
    }
  });

  animate();
}
