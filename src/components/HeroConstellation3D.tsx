import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface HeroConstellation3DProps {
  activeCareerKey: string;
  resolvedTheme: 'dark' | 'light';
}

const _targetVec = new THREE.Vector3();
const _tempObj = new THREE.Object3D();

type ConstellationPreset = {
  nodes: Array<[number, number, number, number]>;
  edges: Array<[number, number]>;
  accentHex: number;
};

const PRESETS: Record<string, ConstellationPreset> = {
  'ai-engineer': {
    accentHex: 0x8b5cf6,
    nodes: [
      [0, 0, 0, 1.0],
      [-2.8, 1.3, -0.6, 0.72],
      [-1.5, -1.6, 0.9, 0.72],
      [2.1, 1.5, 0.5, 0.76],
      [2.9, -1.0, -0.8, 0.7],
      [0.4, 2.3, -1.0, 0.65],
      [-0.5, -2.2, -0.7, 0.65],
      [4.2, 0.4, 0.2, 0.62],
      [-4.1, -0.3, 0.5, 0.62],
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
      [1, 5], [1, 8], [2, 6], [2, 8], [3, 5], [3, 7], [4, 6], [4, 7],
    ],
  },
  'game-developer': {
    accentHex: 0x38bdf8,
    nodes: [
      [0, 0, 0, 1.0],
      [-3.1, 0.9, 0.8, 0.74],
      [3.1, 0.9, -0.8, 0.74],
      [-2.0, -1.8, -0.5, 0.7],
      [2.0, -1.8, 0.5, 0.7],
      [0, 2.5, 0.2, 0.78],
      [-4.2, -0.7, -0.3, 0.62],
      [4.2, -0.7, 0.3, 0.62],
      [0, -2.4, 0.9, 0.62],
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5], [1, 6], [2, 7], [3, 8], [4, 8], [3, 4],
    ],
  },
  'robotics-engineer': {
    accentHex: 0x6366f1,
    nodes: [
      [0, 0, 0, 1.0],
      [-2.2, 0.2, 0.4, 0.76],
      [-3.8, 1.6, -0.2, 0.7],
      [2.2, 0.2, -0.4, 0.76],
      [3.8, 1.6, 0.2, 0.7],
      [0, 2.0, 0.8, 0.72],
      [0, -2.0, -0.6, 0.72],
      [-2.6, -1.7, 0.6, 0.64],
      [2.6, -1.7, -0.6, 0.64],
    ],
    edges: [
      [0, 1], [1, 2], [0, 3], [3, 4], [0, 5], [0, 6], [1, 7], [3, 8], [5, 2], [5, 4],
    ],
  },
  physician: {
    accentHex: 0x34d399,
    nodes: [
      [0, 0, 0, 1.0],
      [-1.8, 1.8, 0.6, 0.72],
      [1.8, 1.8, -0.6, 0.72],
      [-2.8, 0, -0.7, 0.7],
      [2.8, 0, 0.7, 0.7],
      [-1.8, -1.8, 0.6, 0.72],
      [1.8, -1.8, -0.6, 0.72],
      [0, 2.6, 0, 0.64],
      [0, -2.6, 0, 0.64],
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [2, 7], [5, 8], [6, 8], [1, 3], [2, 4],
    ],
  },
  architect: {
    accentHex: 0xfbbf24,
    nodes: [
      [0, 0, 0, 1.0],
      [-2.6, 1.4, 1.0, 0.72],
      [2.6, 1.4, 1.0, 0.72],
      [-2.6, -1.4, -1.0, 0.72],
      [2.6, -1.4, -1.0, 0.72],
      [0, 2.2, -1.1, 0.68],
      [0, -2.2, 1.1, 0.68],
      [-4.0, 0, 0, 0.62],
      [4.0, 0, 0, 0.62],
    ],
    edges: [
      [1, 2], [3, 4], [1, 3], [2, 4], [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 5], [3, 6], [4, 6], [1, 7], [2, 8],
    ],
  },
  entrepreneur: {
    accentHex: 0xa78bfa,
    nodes: [
      [0, 0, 0, 1.0],
      [-2.4, 1.5, 0.2, 0.76],
      [2.4, 1.5, 0.2, 0.76],
      [-3.6, -0.5, -0.5, 0.68],
      [3.6, -0.5, -0.5, 0.68],
      [-1.4, -2.1, 0.7, 0.68],
      [1.4, -2.1, 0.7, 0.68],
      [0, 2.7, -0.4, 0.72],
      [0, -1.2, -1.4, 0.62],
    ],
    edges: [
      [0, 1], [0, 2], [0, 5], [0, 6], [0, 7], [1, 3], [2, 4], [1, 7], [2, 7], [3, 5], [4, 6], [5, 8], [6, 8],
    ],
  },
  'software-developer': {
    accentHex: 0x38bdf8,
    nodes: [
      [0, 0, 0, 1.0],
      [-2.5, 0.8, 0.6, 0.74],
      [-2.5, -1.2, -0.4, 0.72],
      [2.5, 0.8, -0.6, 0.74],
      [2.5, -1.2, 0.4, 0.72],
      [0, 2.3, 0.2, 0.7],
      [0, -2.3, -0.2, 0.7],
      [-4.2, -0.2, 0, 0.62],
      [4.2, -0.2, 0, 0.62],
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 2], [3, 4], [1, 7], [2, 7], [3, 8], [4, 8],
    ],
  },
};

export const HeroConstellation3D: React.FC<HeroConstellation3DProps> = ({
  activeCareerKey,
  resolvedTheme,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const presetRef = useRef<string>(activeCareerKey);
  const themeRef = useRef<'dark' | 'light'>(resolvedTheme);
  const [fallbackActive, setFallbackActive] = useState(false);

  useEffect(() => {
    presetRef.current = activeCareerKey;
  }, [activeCareerKey]);

  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setFallbackActive(true);
      return;
    }

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        preserveDrawingBuffer: isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setFallbackActive(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      46,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.1,
      100
    );
    camera.position.set(0, 0.2, 8.6);

    const keyLight = new THREE.DirectionalLight(0xe0e7ff, 2.2);
    keyLight.position.set(5, 6, 7);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xa78bfa, 0x1e1b4b, 1.15);
    scene.add(hemiLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 6.0, 24);
    rimLight.position.set(-4.5, -2.5, 4);
    scene.add(rimLight);

    const rootGroup = new THREE.Group();
    rootGroup.position.set(2.1, 0.1, 0);
    scene.add(rootGroup);

    // Composite 4-part central intelligence core
    const hubGroup = new THREE.Group();
    const coreGeo = new THREE.IcosahedronGeometry(0.58, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      emissive: 0x6366f1,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.45,
      clearcoat: 1.0,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    hubGroup.add(coreMesh);

    const shellGeo = new THREE.IcosahedronGeometry(0.84, 0);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.4,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      roughness: 0.3,
      metalness: 0.85,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    hubGroup.add(shellMesh);

    const ringGeo = new THREE.TorusGeometry(1.18, 0.024, 12, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.9,
    });
    const ringA = new THREE.Mesh(ringGeo, ringMat);
    ringA.rotation.x = Math.PI * 0.38;
    const ringB = new THREE.Mesh(ringGeo, ringMat);
    ringB.rotation.y = Math.PI * 0.42;
    ringB.scale.setScalar(1.22);
    hubGroup.add(ringA, ringB);
    rootGroup.add(hubGroup);

    // Satellite composite skill nodes
    const nodeGroups: THREE.Group[] = [];
    const nodePositions: THREE.Vector3[] = [];
    const satSphereGeo = new THREE.SphereGeometry(0.24, 20, 20);
    const satHaloGeo = new THREE.TorusGeometry(0.38, 0.018, 10, 32);
    const satMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      emissive: 0x6366f1,
      emissiveIntensity: 0.75,
      roughness: 0.22,
      metalness: 0.6,
    });
    const satHaloMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.85,
    });

    const initialPreset = PRESETS['ai-engineer'];
    for (let i = 0; i < initialPreset.nodes.length; i++) {
      const [x, y, z, s] = initialPreset.nodes[i];
      nodePositions.push(new THREE.Vector3(x, y, z));
      if (i === 0) {
        nodeGroups.push(hubGroup);
        continue;
      }
      const g = new THREE.Group();
      const sphere = new THREE.Mesh(satSphereGeo, satMat);
      const halo = new THREE.Mesh(satHaloGeo, satHaloMat);
      halo.rotation.x = Math.PI * 0.35 + i * 0.4;
      const pin = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.1, 0),
        ringMat
      );
      pin.position.y = 0.34;
      g.add(sphere, halo, pin);
      g.position.set(x, y, z);
      g.scale.setScalar(s);
      rootGroup.add(g);
      nodeGroups.push(g);
    }

    // Dynamic connecting lines
    const maxEdges = 16;
    const linePositions = new Float32Array(maxEdges * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.65,
    });
    const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
    rootGroup.add(lineSegments);

    // Instanced particle field
    const particleCount = 68;
    const pGeo = new THREE.OctahedronGeometry(0.04, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.7,
      roughness: 0.4,
      metalness: 0.5,
    });
    const particles = new THREE.InstancedMesh(pGeo, pMat, particleCount);
    const particleSeeds: Array<{ base: THREE.Vector3; speed: number; phase: number }> = [];
    for (let i = 0; i < particleCount; i++) {
      const base = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6 - 1.5
      );
      particleSeeds.push({ base, speed: 0.2 + Math.random() * 0.35, phase: Math.random() * Math.PI * 2 });
      _tempObj.position.copy(base);
      _tempObj.scale.setScalar(0.6 + Math.random() * 0.8);
      _tempObj.updateMatrix();
      particles.setMatrixAt(i, _tempObj.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
    particles.computeBoundingSphere();
    scene.add(particles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      rootGroup.position.x = w < 900 ? 0 : 2.1;
    };
    onResize();
    window.addEventListener('resize', onResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setFallbackActive(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    let frameId = 0;
    let disposed = false;
    const startTime = performance.now();
    let prevTime = startTime;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - prevTime) / 1000, 0.1) || 0.016;
      const elapsed = (now - startTime) / 1000;
      prevTime = now;

      const preset = PRESETS[presetRef.current] ?? PRESETS['ai-engineer'];
      coreMat.color.lerp(new THREE.Color(preset.accentHex), 1 - Math.exp(-3 * dt));
      lineMat.color.lerp(new THREE.Color(preset.accentHex), 1 - Math.exp(-3 * dt));
      lineMat.opacity = themeRef.current === 'dark' ? 0.62 : 0.45;

      for (let i = 0; i < nodeGroups.length; i++) {
        const [tx, ty, tz] = preset.nodes[i] ?? [0, 0, 0, 0.7];
        const floatY = i === 0 ? 0 : Math.sin(elapsed * 0.9 + i * 1.1) * 0.12;
        _targetVec.set(tx, ty + floatY, tz);
        const pos = nodePositions[i];
        pos.x = THREE.MathUtils.damp(pos.x, _targetVec.x, 4.2, dt);
        pos.y = THREE.MathUtils.damp(pos.y, _targetVec.y, 4.2, dt);
        pos.z = THREE.MathUtils.damp(pos.z, _targetVec.z, 4.2, dt);
        nodeGroups[i].position.copy(pos);
        if (i > 0) {
          nodeGroups[i].rotation.y += dt * 0.4;
        }
      }

      hubGroup.rotation.y += dt * 0.25;
      ringA.rotation.z += dt * 0.35;
      ringB.rotation.x -= dt * 0.28;

      const attr = lineGeo.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      arr.fill(0);
      preset.edges.forEach(([a, b], idx) => {
        if (idx >= maxEdges) return;
        const pa = nodePositions[a];
        const pb = nodePositions[b];
        if (!pa || !pb) return;
        const base = idx * 6;
        arr[base] = pa.x;
        arr[base + 1] = pa.y;
        arr[base + 2] = pa.z;
        arr[base + 3] = pb.x;
        arr[base + 4] = pb.y;
        arr[base + 5] = pb.z;
      });
      attr.needsUpdate = true;

      for (let i = 0; i < particleCount; i++) {
        const seed = particleSeeds[i];
        _tempObj.position.set(
          seed.base.x + Math.sin(elapsed * seed.speed + seed.phase) * 0.25,
          seed.base.y + Math.cos(elapsed * seed.speed + seed.phase) * 0.25,
          seed.base.z
        );
        _tempObj.rotation.set(elapsed * 0.2, elapsed * 0.3, 0);
        _tempObj.updateMatrix();
        particles.setMatrixAt(i, _tempObj.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;

      rootGroup.rotation.y = THREE.MathUtils.damp(rootGroup.rotation.y, pointer.x * 0.22, 3, dt);
      rootGroup.rotation.x = THREE.MathUtils.damp(rootGroup.rotation.x, -pointer.y * 0.14, 3, dt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      satSphereGeo.dispose();
      satHaloGeo.dispose();
      satMat.dispose();
      satHaloMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (fallbackActive) {
    return (
      <div
        aria-hidden="true"
        data-testid="hero-constellation-fallback"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <svg viewBox="0 0 1200 700" className="h-full w-full opacity-55">
          <defs>
            <radialGradient id="staticGlow" cx="68%" cy="45%" r="42%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.32" />
              <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="700" fill="url(#staticGlow)" />
          <g stroke="#8B5CF6" strokeOpacity="0.28" strokeWidth="1.2">
            <line x1="820" y1="330" x2="660" y2="210" />
            <line x1="820" y1="330" x2="980" y2="220" />
            <line x1="820" y1="330" x2="700" y2="470" />
            <line x1="820" y1="330" x2="990" y2="450" />
            <line x1="660" y1="210" x2="980" y2="220" />
          </g>
          <circle cx="820" cy="330" r="18" fill="#8B5CF6" fillOpacity="0.8" />
          <circle cx="660" cy="210" r="8" fill="#6366F1" />
          <circle cx="980" cy="220" r="9" fill="#38BDF8" />
          <circle cx="700" cy="470" r="8" fill="#8B5CF6" />
          <circle cx="990" cy="450" r="8" fill="#34D399" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="hero-constellation-3d"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
};
