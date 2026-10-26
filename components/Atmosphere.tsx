'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 底层薄纱雾气氛围层（R3F，完全自包含，零外部资源加载）
 * - 程序化径向渐变光斑（CanvasTexture 生成，无网络依赖）
 * - 深藏青渐变 + 朦胧体积雾 + 流动光晕，胶片刻度，低强度
 * - Canvas 置于 DOM 底层，pointer-events:none，绝不遮挡上层交互
 * - 移动端 <768px 强制关闭 WebGL，切换静态渐变背景兜底
 */

/** 柔和光斑：单张径向渐变 sprite，缓慢漂移 */
function Wisp({
  position,
  color,
  opacity,
  size,
  speed = 0.1,
  drift = 1.2,
}: {
  position: [number, number, number];
  color: string;
  opacity: number;
  size: number;
  speed?: number;
  drift?: number;
}) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.x = position[0] + Math.sin(t * 0.06 * speed) * drift;
    ref.current.position.y = position[1] + Math.cos(t * 0.045 * speed) * drift * 0.6;
  });

  return (
    <sprite ref={ref} position={position} scale={[size, size, 1]}>
      <spriteMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </sprite>
  );
}

export default function Atmosphere() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compute = () => mq.matches && !reduce && detectWebGL();
    setEnabled(compute());
    const onChange = () => setEnabled(compute());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      {/* 静态渐变底层（始终存在，移动端降级兜底） */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, #1A2A38 0%, #0E1A24 55%, #0B141C 100%)',
        }}
      />

      {/* WebGL 薄纱雾气（≥768px 且允许动效时启用；任何异常自动静默降级） */}
      {enabled && (
        <GlErrorBoundary>
          <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [0, 0, 12], fov: 42 }}
              gl={{ antialias: true, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false }}
              style={{ background: 'transparent' }}
            >
              <fog attach="fog" args={['#0E1A24', 8, 22]} />
              <ambientLight intensity={0.25} />
              <directionalLight position={[4, 6, 4]} intensity={0.5} color="#C9A24B" />

              {/* 左路灰纱 */}
              <Wisp position={[-5.5, 1.6, -3]} color="#5C6E7E" opacity={0.26} size={9} speed={1} drift={1.4} />
              {/* 中路淡淡薄纱 */}
              <Wisp position={[1.2, -0.4, -5]} color="#6E7F8C" opacity={0.2} size={12} speed={0.8} drift={1.8} />
              {/* 右上暖金光晕 */}
              <Wisp position={[6, 3.4, -2]} color="#C9A24B" opacity={0.22} size={7} speed={1.1} drift={1} />
              {/* 左下暗处微光 */}
              <Wisp position={[-6, -3.5, -1]} color="#3A4A58" opacity={0.16} size={8} speed={0.6} drift={1.2} />

              {/* 极少量尘埃光点，只作氛围 */}
              <Sparkles count={36} scale={[14, 7, 6]} size={1.4} speed={0.18} opacity={0.28} color="#D8BC7E" />
            </Canvas>
          </div>
        </GlErrorBoundary>
      )}
    </>
  );
}

/** WebGL 失败（无 GPU / 上下文丢失）时静默降级为静态背景，不阻塞页面 */
class GlErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* 静默：氛围层只是装饰，不干扰主内容 */
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/** 前置探测 WebGL 支持；不支持（无 GPU / 被禁用）时不挂载 Canvas */
function detectWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}
