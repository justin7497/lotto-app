import { useEffect, useRef } from "react";
import Matter from "matter-js";
import {
  applyMixingForces,
  createBallDrawPhysicsWorld,
  destroyBallDrawPhysicsWorld,
  renderPhysicsWorld,
  type BallDrawPhysicsWorld,
} from "@/utils/ballDrawPhysics";

type BallDrawPhysicsCanvasProps = {
  active: boolean;
  vigorous: boolean;
  resetKey: number;
};

export default function BallDrawPhysicsCanvas({
  active,
  vigorous,
  resetKey,
}: BallDrawPhysicsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<BallDrawPhysicsWorld | null>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const setup = () => {
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (worldRef.current) {
        destroyBallDrawPhysicsWorld(worldRef.current);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      worldRef.current = createBallDrawPhysicsWorld(width, height);
      frameRef.current = 0;
    };

    setup();

    const ro = new ResizeObserver(() => {
      setup();
    });
    ro.observe(wrap);

    return () => {
      ro.disconnect();
      if (worldRef.current) {
        destroyBallDrawPhysicsWorld(worldRef.current);
        worldRef.current = null;
      }
    };
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const tick = () => {
      rafRef.current = window.requestAnimationFrame(tick);
      const world = worldRef.current;
      if (!world) return;

      const width = world.width;
      const height = world.height;

      if (active) {
        Matter.Engine.update(world.engine, 1000 / 60);
        frameRef.current += 1;
        if (frameRef.current % 2 === 0) {
          applyMixingForces(world, vigorous ? 0.0014 : 0.00055);
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderPhysicsWorld(ctx, world, width, height);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [active, vigorous, resetKey]);

  return (
    <div ref={wrapRef} className="ball-draw-machine__physics-wrap">
      <canvas ref={canvasRef} className="ball-draw-machine__physics-canvas" aria-hidden />
    </div>
  );
}
