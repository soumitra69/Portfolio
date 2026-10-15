"use client";

import { useEffect, useRef, useState } from "react";

export default function HeroScene({
  enabled = true,
  name = "Soumitra Samanta",
}) {
  const stage = useRef(null);
  const canvas = useRef(null);
  const [supported, setSupported] = useState(false);
  const [paused, setPaused] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [sceneAvailable, setSceneAvailable] = useState(false);

  useEffect(() => {
    const media = matchMedia(
      "(min-width: 769px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const update = () =>
      setSupported(
        enabled &&
          media.matches &&
          !(navigator.deviceMemory && navigator.deviceMemory < 4),
      );
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [enabled]);

  useEffect(() => {
    if (!supported || paused) return;
    let cancelled = false;
    let dispose = () => {};
    const target = canvas.current;
    const element = stage.current;
    let context;
    try {
      context = target?.getContext("webgl2", {
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    if (!context || context.isContextLost() || !element) return;
    const information = context.getExtension("WEBGL_debug_renderer_info");
    const device = information
      ? context.getParameter(information.UNMASKED_RENDERER_WEBGL)
      : "";
    if (/swiftshader|llvmpipe|software|softpipe/i.test(device)) {
      setSceneAvailable(false);
      context.getExtension("WEBGL_lose_context")?.loseContext();
      return;
    }
    // Three is a separate, on-demand chunk; mobile and reduced-motion users
    // never download the renderer. The CSS composition remains the fallback.
    import("three")
      .then((THREE) => {
        if (cancelled || !canvas.current || !stage.current) return;
        const renderer = new THREE.WebGLRenderer({
          canvas: target,
          context,
          alpha: true,
          antialias: true,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
        renderer.setClearColor(0x000000, 0);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
        camera.position.z = 6.6;
        const object = new THREE.Group();
        scene.add(object);
        const core = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.08, 1),
          new THREE.MeshStandardMaterial({
            color: 0x8574e8,
            roughness: 0.28,
            metalness: 0.48,
            flatShading: true,
          }),
        );
        object.add(core);
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(core.geometry),
          new THREE.LineBasicMaterial({
            color: 0xd6cfff,
            transparent: true,
            opacity: 0.28,
          }),
        );
        core.add(edges);
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.5 + i * 0.18, 0.009, 6, 80),
            new THREE.MeshBasicMaterial({
              color: i === 1 ? 0x62d8cf : 0x9b8cf0,
              transparent: true,
              opacity: 0.5,
            }),
          );
          ring.rotation.set(0.65 + i * 0.55, i * 0.7, 0.35 + i);
          object.add(ring);
        }
        const satellites = [];
        for (let i = 0; i < 4; i++) {
          const dot = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.08 + i * 0.012),
            new THREE.MeshStandardMaterial({
              color: i % 2 ? 0x68dad1 : 0xb5a9ff,
              metalness: 0.3,
              roughness: 0.4,
            }),
          );
          satellites.push(dot);
          object.add(dot);
        }
        const positions = new Float32Array(48 * 3);
        for (let i = 0; i < 48; i++) {
          positions[i * 3] = Math.sin(i * 14.73) * 2.7;
          positions[i * 3 + 1] = Math.cos(i * 9.13) * 2.4;
          positions[i * 3 + 2] = Math.sin(i * 3.47) * 1.4 - 0.8;
        }
        const particles = new THREE.BufferGeometry();
        particles.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        scene.add(
          new THREE.Points(
            particles,
            new THREE.PointsMaterial({
              color: 0xbeb4fa,
              size: 0.018,
              transparent: true,
              opacity: 0.5,
            }),
          ),
        );
        scene.add(new THREE.HemisphereLight(0xd6dcff, 0x17132e, 2.3));
        const light = new THREE.DirectionalLight(0xc9b7ff, 4);
        light.position.set(2, 4, 4);
        scene.add(light);
        const rim = new THREE.DirectionalLight(0x5fd8de, 3);
        rim.position.set(-3, -1, 2);
        scene.add(rim);
        let frame = null;
        let visible = true;
        let last = 0;
        let elapsed = 0;
        const pointer = { x: 0, y: 0 };
        function resize() {
          const width = element.clientWidth;
          const height = element.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
        function tick(time) {
          frame = null;
          if (cancelled || !visible || document.hidden) return;
          frame = requestAnimationFrame(tick);
          if (time - last < 1000 / 24) return;
          const delta = last ? Math.min((time - last) / 1000, 0.06) : 0;
          elapsed += delta;
          last = time;
          object.rotation.y += (pointer.x * 0.28 - object.rotation.y) * 0.045;
          object.rotation.x += (-pointer.y * 0.18 - object.rotation.x) * 0.045;
          core.rotation.y = elapsed * 0.11;
          core.rotation.z = elapsed * 0.06;
          object.position.y = Math.sin(elapsed * 0.65) * 0.08;
          satellites.forEach((dot, i) => {
            const angle = elapsed * 0.12 + (i * Math.PI) / 2;
            dot.position.set(
              Math.cos(angle) * 1.85,
              Math.sin(angle) * 1.4,
              Math.sin(angle + i) * 0.7,
            );
            dot.rotation.y = elapsed * 0.3;
          });
          renderer.render(scene, camera);
        }
        function synchronize() {
          if (frame !== null) cancelAnimationFrame(frame);
          frame = null;
          last = 0;
          if (visible && !document.hidden) frame = requestAnimationFrame(tick);
        }
        function move(event) {
          const bounds = element.getBoundingClientRect();
          pointer.x = (event.clientX - bounds.left) / bounds.width - 0.5;
          pointer.y = (event.clientY - bounds.top) / bounds.height - 0.5;
          element.style.setProperty("--scene-x", `${pointer.x * 18}px`);
          element.style.setProperty("--scene-y", `${pointer.y * 18}px`);
        }
        const leave = () => {
          pointer.x = pointer.y = 0;
        };
        const observer = new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            synchronize();
          },
          { threshold: 0.05 },
        );
        const sizeObserver = new ResizeObserver(resize);
        const lost = (event) => {
          event.preventDefault();
          visible = false;
          synchronize();
          setWebgl(false);
          setSceneAvailable(false);
        };
        observer.observe(element);
        sizeObserver.observe(element);
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerleave", leave);
        target.addEventListener("webglcontextlost", lost);
        document.addEventListener("visibilitychange", synchronize);
        resize();
        synchronize();
        setWebgl(true);
        setSceneAvailable(true);
        dispose = () => {
          if (frame !== null) cancelAnimationFrame(frame);
          observer.disconnect();
          sizeObserver.disconnect();
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerleave", leave);
          target.removeEventListener("webglcontextlost", lost);
          document.removeEventListener("visibilitychange", synchronize);
          const geometries = new Set();
          const materials = new Set();
          scene.traverse((item) => {
            if (item.geometry) geometries.add(item.geometry);
            if (item.material) materials.add(item.material);
          });
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
          renderer.dispose();
        };
      })
      .catch(() => {
        if (!cancelled) {
          setWebgl(false);
          setSceneAvailable(false);
        }
      });
    return () => {
      cancelled = true;
      dispose();
      setWebgl(false);
    };
  }, [supported, paused]);

  return (
    <div
      className="hero-scene"
      ref={stage}
      data-renderer={webgl ? "webgl" : "css"}
      data-paused={paused || !supported}
    >
      <div className="scene-halo" aria-hidden="true" />
      <div className="scene-fallback" aria-hidden="true">
        <div className="scene-orb">
          <span>&lt;/&gt;</span>
        </div>
        <div className="scene-ring scene-ring-one" />
        <div className="scene-ring scene-ring-two" />
        <span className="scene-star star-one" />
        <span className="scene-star star-two" />
        <span className="scene-star star-three" />
      </div>
      <canvas ref={canvas} aria-hidden="true" className="scene-canvas" />
      <div className="scene-code" aria-hidden="true">
        <span className="code-window">
          <i />
          <i />
          <i /> <b>portfolio.js</b>
        </span>
        <code>
          <span>const</span> developer = &#123;
          <br />
          &nbsp; name: <em>&quot;{name.split(" ")[0]}&quot;</em>,<br />
          &nbsp; focus: <em>&quot;building for the web&quot;</em>
          <br />
          &#125;;
        </code>
      </div>
      <div className="scene-label" aria-hidden="true">
        <span />
        <span>Ideas. Code. Experiences.</span>
      </div>
      {supported && sceneAvailable && (
        <button
          className="scene-control"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Resume 3D animation" : "Pause 3D animation"}
          aria-pressed={paused}
        >
          <i
            className={`fas fa-${paused ? "play" : "pause"}`}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
