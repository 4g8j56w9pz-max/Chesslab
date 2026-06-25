import { GameState, TAU, normalizeAngle } from "./game-engine.js";

const COLORS = Object.freeze({
  red: "#DE3341",
  redDark: "#781821",
  offWhite: "#fff8ed",
  muted: "#b8aaa2",
  charcoal: "#111113",
  black: "#060607",
  amber: "#ffd166",
  blue: "#89a8b8"
});

function canvasAngle(angle) {
  return normalizeAngle(angle) - Math.PI / 2;
}

function polarPoint(centerX, centerY, radius, angle) {
  const a = canvasAngle(angle);
  return {
    x: centerX + Math.cos(a) * radius,
    y: centerY + Math.sin(a) * radius
  };
}

function drawWrappedArc(context, centerX, centerY, radius, centerAngle, width) {
  const start = normalizeAngle(centerAngle - width / 2);
  const end = normalizeAngle(centerAngle + width / 2);

  context.beginPath();
  if (start <= end) {
    context.arc(centerX, centerY, radius, canvasAngle(start), canvasAngle(end));
  } else {
    context.arc(centerX, centerY, radius, canvasAngle(start), canvasAngle(TAU));
    context.moveTo(
      centerX + Math.cos(canvasAngle(0)) * radius,
      centerY + Math.sin(canvasAngle(0)) * radius
    );
    context.arc(centerX, centerY, radius, canvasAngle(0), canvasAngle(end));
  }
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export class LockPopRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.pixelRatio = 1;
    this.width = 0;
    this.height = 0;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.resize();
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(280, Math.round(rect.width));
    const height = Math.max(280, Math.round(rect.height || rect.width));
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));

    if (width === this.width && height === this.height && ratio === this.pixelRatio) {
      return false;
    }

    this.width = width;
    this.height = height;
    this.pixelRatio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return true;
  }

  render(snapshot, view = {}) {
    this.resize();

    const context = this.context;
    const width = this.width;
    const height = this.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.34;
    const railWidth = Math.max(18, radius * 0.125);
    const now = view.now || 0;
    const displayScore = Math.round(view.displayScore ?? snapshot.score);
    const bestScore = view.bestScore ?? 0;

    context.clearRect(0, 0, width, height);
    this.drawBackground(context, width, height, now);
    this.drawDial(context, centerX, centerY, radius, railWidth, snapshot, now);
    this.drawEffects(context, centerX, centerY, radius, railWidth, view.effects || [], now);
    this.drawMarker(context, centerX, centerY, radius, snapshot.markerAngle, snapshot.direction);
    this.drawCenterReadout(context, centerX, centerY, radius, snapshot, displayScore, bestScore);
    this.drawStateOverlay(context, centerX, centerY, radius, snapshot, now);
  }

  drawBackground(context, width, height, now) {
    const glow = context.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.72);
    glow.addColorStop(0, "#1e1c1d");
    glow.addColorStop(0.54, COLORS.charcoal);
    glow.addColorStop(1, COLORS.black);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalAlpha = 0.18;
    context.strokeStyle = COLORS.red;
    context.lineWidth = 1;
    const offset = this.reducedMotion ? 0 : (now / 70) % 18;
    for (let x = -height + offset; x < width + height; x += 18) {
      context.beginPath();
      context.moveTo(x, height);
      context.lineTo(x + height, 0);
      context.stroke();
    }
    context.restore();
  }

  drawDial(context, centerX, centerY, radius, railWidth, snapshot, now) {
    context.save();
    context.lineCap = "round";

    context.strokeStyle = "rgba(255, 248, 237, 0.12)";
    context.lineWidth = railWidth + 12;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, TAU);
    context.stroke();

    context.strokeStyle = "rgba(0, 0, 0, 0.72)";
    context.lineWidth = railWidth + 2;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, TAU);
    context.stroke();

    context.strokeStyle = COLORS.offWhite;
    context.globalAlpha = 0.9;
    context.lineWidth = Math.max(5, railWidth * 0.28);
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, TAU);
    context.stroke();

    context.globalAlpha = 1;
    this.drawTicks(context, centerX, centerY, radius, railWidth, now);
    this.drawTarget(context, centerX, centerY, radius, railWidth, snapshot);
    context.restore();
  }

  drawTicks(context, centerX, centerY, radius, railWidth, now) {
    const tickCount = 48;
    const idleDrift = this.reducedMotion ? 0 : Math.sin(now / 900) * 0.06;

    context.save();
    context.strokeStyle = "rgba(255, 248, 237, 0.44)";
    context.lineWidth = 1.5;

    for (let index = 0; index < tickCount; index += 1) {
      const angle = index / tickCount * TAU + idleDrift;
      const inner = radius - railWidth * (index % 4 === 0 ? 0.94 : 0.68);
      const outer = radius - railWidth * 0.38;
      const start = polarPoint(centerX, centerY, inner, angle);
      const end = polarPoint(centerX, centerY, outer, angle);

      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }

    context.restore();
  }

  drawTarget(context, centerX, centerY, radius, railWidth, snapshot) {
    context.save();
    context.lineCap = "butt";

    context.strokeStyle = COLORS.red;
    context.lineWidth = railWidth + 10;
    drawWrappedArc(context, centerX, centerY, radius, snapshot.targetAngle, snapshot.targetWidth);
    context.stroke();

    context.strokeStyle = COLORS.offWhite;
    context.lineWidth = 2.5;
    drawWrappedArc(context, centerX, centerY, radius, snapshot.targetAngle, snapshot.targetWidth);
    context.stroke();

    context.strokeStyle = COLORS.amber;
    context.lineWidth = Math.max(6, railWidth * 0.34);
    drawWrappedArc(context, centerX, centerY, radius - railWidth * 0.18, snapshot.targetAngle, snapshot.perfectWidth);
    context.stroke();

    context.strokeStyle = "rgba(255, 248, 237, 0.72)";
    context.lineWidth = 1.2;
    const hatchCount = 5;
    for (let index = 0; index < hatchCount; index += 1) {
      const fraction = hatchCount === 1 ? 0.5 : index / (hatchCount - 1);
      const angle = snapshot.targetAngle - snapshot.targetWidth * 0.38 + snapshot.targetWidth * 0.76 * fraction;
      const start = polarPoint(centerX, centerY, radius - railWidth * 0.78, angle);
      const end = polarPoint(centerX, centerY, radius + railWidth * 0.72, angle);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }

    const left = polarPoint(centerX, centerY, radius, snapshot.targetAngle - snapshot.targetWidth / 2);
    const right = polarPoint(centerX, centerY, radius, snapshot.targetAngle + snapshot.targetWidth / 2);
    context.fillStyle = COLORS.offWhite;
    context.beginPath();
    context.arc(left.x, left.y, 4, 0, TAU);
    context.arc(right.x, right.y, 4, 0, TAU);
    context.fill();

    context.restore();
  }

  drawMarker(context, centerX, centerY, radius, markerAngle, direction) {
    const point = polarPoint(centerX, centerY, radius, markerAngle);
    const visualAngle = canvasAngle(markerAngle);
    const radialX = Math.cos(visualAngle);
    const radialY = Math.sin(visualAngle);
    const tangentX = -radialY * Math.sign(direction || 1);
    const tangentY = radialX * Math.sign(direction || 1);
    const size = Math.max(15, radius * 0.1);

    context.save();
    context.shadowColor = "rgba(222, 51, 65, 0.86)";
    context.shadowBlur = 20;
    context.fillStyle = COLORS.red;
    context.strokeStyle = COLORS.offWhite;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(point.x + radialX * size * 1.05, point.y + radialY * size * 1.05);
    context.lineTo(point.x - radialX * size * 0.72 + tangentX * size * 0.56, point.y - radialY * size * 0.72 + tangentY * size * 0.56);
    context.lineTo(point.x - radialX * size * 0.72 - tangentX * size * 0.56, point.y - radialY * size * 0.72 - tangentY * size * 0.56);
    context.closePath();
    context.fill();
    context.stroke();

    context.shadowBlur = 0;
    context.fillStyle = COLORS.offWhite;
    context.beginPath();
    context.arc(point.x, point.y, size * 0.18, 0, TAU);
    context.fill();
    context.restore();
  }

  drawEffects(context, centerX, centerY, radius, railWidth, effects, now) {
    for (const effect of effects) {
      const age = Math.max(0, now - effect.startedAt);
      const duration = effect.duration || 420;
      const progress = clamp01(age / duration);
      const eased = easeOutCubic(progress);

      if (effect.type === "hit" || effect.type === "perfect") {
        context.save();
        context.globalAlpha = 1 - progress;
        context.strokeStyle = effect.type === "perfect" ? COLORS.amber : COLORS.offWhite;
        context.lineWidth = Math.max(2, railWidth * (0.18 + progress * 0.55));
        drawWrappedArc(context, centerX, centerY, radius + eased * 18, effect.angle, effect.width + eased * 0.24);
        context.stroke();

        const point = polarPoint(centerX, centerY, radius, effect.angle);
        context.fillStyle = effect.type === "perfect" ? COLORS.amber : COLORS.red;
        context.beginPath();
        context.arc(point.x, point.y, 10 + eased * 28, 0, TAU);
        context.fill();
        context.restore();
      }

      if (effect.type === "miss") {
        context.save();
        context.globalAlpha = this.reducedMotion ? 0.18 : 0.36 * (1 - progress);
        context.fillStyle = COLORS.red;
        context.fillRect(0, 0, this.width, this.height);
        context.restore();
      }
    }
  }

  drawCenterReadout(context, centerX, centerY, radius, snapshot, displayScore, bestScore) {
    const diskRadius = radius * 0.58;
    const gradient = context.createRadialGradient(centerX, centerY - diskRadius * 0.25, 5, centerX, centerY, diskRadius);
    gradient.addColorStop(0, "#242123");
    gradient.addColorStop(1, "#0b0b0c");

    context.save();
    context.fillStyle = gradient;
    context.strokeStyle = "rgba(255, 248, 237, 0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(centerX, centerY, diskRadius, 0, TAU);
    context.fill();
    context.stroke();

    context.fillStyle = COLORS.muted;
    context.font = "800 11px ui-sans-serif, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("SCORE", centerX, centerY - diskRadius * 0.42);

    context.fillStyle = COLORS.offWhite;
    context.font = `950 ${Math.max(44, radius * 0.34)}px ui-sans-serif, system-ui, sans-serif`;
    context.fillText(String(displayScore), centerX, centerY + 2);

    context.fillStyle = snapshot.state === GameState.GAME_OVER ? COLORS.red : COLORS.amber;
    context.font = "850 12px ui-sans-serif, system-ui, sans-serif";
    context.fillText(`BEST ${bestScore}`, centerX, centerY + diskRadius * 0.43);
    context.restore();
  }

  drawStateOverlay(context, centerX, centerY, radius, snapshot, now) {
    let label = "";
    let alpha = 1;

    if (snapshot.state === GameState.READY) {
      label = "LOCK POP";
      alpha = this.reducedMotion ? 1 : 0.78 + Math.sin(now / 380) * 0.12;
    } else if (snapshot.state === GameState.COUNTDOWN) {
      const slice = snapshot.countdownSeconds / 3;
      label = String(Math.max(1, Math.ceil(snapshot.countdownRemaining / slice)));
    } else if (snapshot.state === GameState.PAUSED) {
      label = "PAUSED";
    } else if (snapshot.state === GameState.GAME_OVER) {
      label = "MISS";
    }

    if (!label) {
      return;
    }

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = snapshot.state === GameState.GAME_OVER ? COLORS.red : COLORS.offWhite;
    context.strokeStyle = "rgba(0, 0, 0, 0.72)";
    context.lineWidth = 5;
    context.font = `950 ${Math.max(22, radius * 0.18)}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeText(label, centerX, centerY - radius * 0.72);
    context.fillText(label, centerX, centerY - radius * 0.72);
    context.restore();
  }
}
