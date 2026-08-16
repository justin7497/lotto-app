import Matter from "matter-js";
import { getBallFlatColor } from "@/utils/lottoBallColors";

export type PhysicsBall = {
  id: number;
  number: number;
  body: Matter.Body;
};

export type BallDrawPhysicsWorld = {
  engine: Matter.Engine;
  balls: PhysicsBall[];
  walls: Matter.Body[];
  ballRadius: number;
  width: number;
  height: number;
  dome: DomeBounds;
};

export type DomeBounds = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  floorY: number;
};

function getDomeBounds(width: number, height: number, ballRadius: number): DomeBounds {
  const cx = width * 0.5;
  const cy = height * 0.56;
  const rx = width * 0.4 - ballRadius * 0.35;
  const ry = height * 0.43 - ballRadius * 0.35;
  const floorY = cy + ry * 0.08;
  return { cx, cy, rx, ry, floorY };
}

function wallSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
): Matter.Body {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return Matter.Bodies.rectangle(midX, midY, length, thickness, {
    isStatic: true,
    angle,
    friction: 0.05,
    restitution: 0.45,
    label: "wall",
  });
}

function createDomeWalls(width: number, height: number, ballRadius: number): Matter.Body[] {
  const dome = getDomeBounds(width, height, ballRadius);
  const { cx, cy, rx, ry, floorY } = dome;
  const thickness = Math.max(ballRadius * 0.65, 5);
  const walls: Matter.Body[] = [];

  const arcPoints: { x: number; y: number }[] = [];
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI + t * Math.PI;
    arcPoints.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }

  for (let i = 0; i < arcPoints.length - 1; i++) {
    const a = arcPoints[i];
    const b = arcPoints[i + 1];
    walls.push(wallSegment(a.x, a.y, b.x, b.y, thickness));
  }

  const gap = width * 0.16;
  const leftEnd = cx - gap / 2;
  const rightStart = cx + gap / 2;
  walls.push(
    Matter.Bodies.rectangle(leftEnd / 2, floorY, leftEnd, thickness, {
      isStatic: true,
      friction: 0.08,
      restitution: 0.35,
      label: "wall",
    }),
  );
  walls.push(
    Matter.Bodies.rectangle(
      rightStart + (width - rightStart) / 2,
      floorY,
      width - rightStart,
      thickness,
      { isStatic: true, friction: 0.08, restitution: 0.35, label: "wall" },
    ),
  );

  return walls;
}

function randomBallNumber(seed: number): number {
  return ((seed * 7 + 3) % 45) + 1;
}

export function createBallDrawPhysicsWorld(width: number, height: number): BallDrawPhysicsWorld {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 0.85, scale: 0.0012 },
  });
  engine.positionIterations = 10;
  engine.velocityIterations = 7;

  const ballRadius = Math.max(8, Math.min(width, height) * 0.088);
  const dome = getDomeBounds(width, height, ballRadius);
  const walls = createDomeWalls(width, height, ballRadius);
  Matter.Composite.add(engine.world, walls);

  const balls: PhysicsBall[] = [];
  const count = 18;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * Math.min(dome.rx, dome.ry) * 0.55;
    const x = dome.cx + Math.cos(angle) * dist;
    const y = dome.cy + Math.sin(angle) * dist * 0.55;
    const body = Matter.Bodies.circle(x, y, ballRadius, {
      restitution: 0.58,
      friction: 0.05,
      frictionAir: 0.02,
      density: 0.0016,
      label: "ball",
    });
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
    });
    balls.push({ id: i, number: randomBallNumber(i), body });
  }
  Matter.Composite.add(
    engine.world,
    balls.map((b) => b.body),
  );

  return { engine, balls, walls, ballRadius, width, height, dome };
}

export function destroyBallDrawPhysicsWorld(world: BallDrawPhysicsWorld): void {
  Matter.Composite.clear(world.engine.world, false, true);
  Matter.Engine.clear(world.engine);
}

export function applyMixingForces(world: BallDrawPhysicsWorld, strength: number): void {
  for (const ball of world.balls) {
    Matter.Body.applyForce(ball.body, ball.body.position, {
      x: (Math.random() - 0.5) * strength,
      y: (Math.random() - 0.5) * strength * 0.45,
    });
  }
}

function clipToDome(ctx: CanvasRenderingContext2D, dome: DomeBounds): void {
  const { cx, cy, rx, ry, floorY } = dome;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
  ctx.lineTo(cx + rx, floorY);
  ctx.lineTo(cx - rx, floorY);
  ctx.closePath();
  ctx.clip();
}

export function drawPhysicsBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  number: number,
): void {
  const color = getBallFlatColor(number);
  const textColor = number <= 10 ? "#1a1a1a" : "#ffffff";

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.14)";
  ctx.lineWidth = Math.max(1, radius * 0.07);
  ctx.stroke();

  const highlight = ctx.createRadialGradient(
    x - radius * 0.22,
    y - radius * 0.28,
    radius * 0.05,
    x,
    y,
    radius,
  );
  highlight.addColorStop(0, "rgba(255,255,255,0.45)");
  highlight.addColorStop(0.35, "rgba(255,255,255,0.08)");
  highlight.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = highlight;
  ctx.fill();

  const fontSize = Math.max(9, radius * 0.98);
  ctx.fillStyle = textColor;
  ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), x, y + radius * 0.03);
  ctx.restore();
}

export function renderPhysicsWorld(
  ctx: CanvasRenderingContext2D,
  world: BallDrawPhysicsWorld,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  clipToDome(ctx, world.dome);
  for (const ball of world.balls) {
    const { x, y } = ball.body.position;
    drawPhysicsBall(ctx, x, y, world.ballRadius, ball.number);
  }
  ctx.restore();
}
