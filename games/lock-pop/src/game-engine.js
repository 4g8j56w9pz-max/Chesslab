export const TAU = Math.PI * 2;

export const GameState = Object.freeze({
  READY: "READY",
  COUNTDOWN: "COUNTDOWN",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAME_OVER: "GAME_OVER"
});

export const DEFAULT_RULES = Object.freeze({
  initialSpeed: 1.72,
  maxSpeed: 4.85,
  speedCurve: 0.085,
  initialTargetWidth: toRadians(31),
  minTargetWidth: toRadians(8.5),
  targetWidthCurve: 0.055,
  perfectWidthRatio: 0.34,
  minPerfectWidth: toRadians(3),
  minSeparation: toRadians(52),
  minReactionSeconds: 0.42,
  countdownSeconds: 1.15,
  maxFrameDelta: 1 / 20
});

export const LEGAL_TRANSITIONS = Object.freeze({
  [GameState.READY]: Object.freeze([GameState.COUNTDOWN]),
  [GameState.COUNTDOWN]: Object.freeze([GameState.PLAYING, GameState.PAUSED, GameState.READY]),
  [GameState.PLAYING]: Object.freeze([GameState.PAUSED, GameState.GAME_OVER, GameState.READY]),
  [GameState.PAUSED]: Object.freeze([GameState.COUNTDOWN, GameState.READY, GameState.GAME_OVER]),
  [GameState.GAME_OVER]: Object.freeze([GameState.COUNTDOWN, GameState.READY])
});

export function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

export function normalizeAngle(angle) {
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
}

export function signedAngularDelta(fromAngle, toAngle) {
  return normalizeAngle(toAngle - fromAngle + Math.PI) - Math.PI;
}

export function shortestAngularDistance(firstAngle, secondAngle) {
  return Math.abs(signedAngularDelta(firstAngle, secondAngle));
}

export function travelDistanceInDirection(fromAngle, toAngle, direction) {
  const from = normalizeAngle(fromAngle);
  const to = normalizeAngle(toAngle);
  return direction >= 0 ? normalizeAngle(to - from) : normalizeAngle(from - to);
}

export function isAngleInsideArc(angle, centerAngle, width) {
  return shortestAngularDistance(angle, centerAngle) <= width / 2;
}

export function isTargetHit(markerAngle, targetAngle, targetWidth) {
  return isAngleInsideArc(markerAngle, targetAngle, targetWidth);
}

export function getPerfectTargetWidth(targetWidth, rules = DEFAULT_RULES) {
  return Math.min(targetWidth, Math.max(rules.minPerfectWidth, targetWidth * rules.perfectWidthRatio));
}

export function isPerfectHit(markerAngle, targetAngle, targetWidth, rules = DEFAULT_RULES) {
  return isAngleInsideArc(markerAngle, targetAngle, getPerfectTargetWidth(targetWidth, rules));
}

export function calculateSpeed(hitCount, rules = DEFAULT_RULES) {
  const normalizedHits = Math.max(0, Number(hitCount) || 0);
  const eased = 1 - Math.exp(-normalizedHits * rules.speedCurve);
  return Math.min(rules.maxSpeed, rules.initialSpeed + (rules.maxSpeed - rules.initialSpeed) * eased);
}

export function calculateTargetWidth(hitCount, rules = DEFAULT_RULES) {
  const normalizedHits = Math.max(0, Number(hitCount) || 0);
  const easedWidth = rules.minTargetWidth + (rules.initialTargetWidth - rules.minTargetWidth) * Math.exp(-normalizedHits * rules.targetWidthCurve);
  return Math.max(rules.minTargetWidth, easedWidth);
}

export function getScoreDelta(quality) {
  return quality === "perfect" ? 2 : 1;
}

export function applyScore(currentScore, quality) {
  return Math.max(0, Number(currentScore) || 0) + getScoreDelta(quality);
}

export function getMinimumSpawnTravel(speed, targetWidth, rules = DEFAULT_RULES) {
  return Math.max(rules.minSeparation, speed * rules.minReactionSeconds + targetWidth / 2);
}

export function isFairTargetPlacement({
  markerAngle,
  targetAngle,
  direction,
  speed,
  targetWidth,
  previousTargetAngle = null,
  rules = DEFAULT_RULES
}) {
  const markerSeparation = shortestAngularDistance(markerAngle, targetAngle);
  if (markerSeparation < rules.minSeparation) {
    return false;
  }

  const travel = travelDistanceInDirection(markerAngle, targetAngle, direction);
  if (travel < getMinimumSpawnTravel(speed, targetWidth, rules)) {
    return false;
  }

  if (travel > TAU - rules.minSeparation / 2) {
    return false;
  }

  if (previousTargetAngle !== null) {
    const targetSeparation = shortestAngularDistance(previousTargetAngle, targetAngle);
    if (targetSeparation < Math.max(targetWidth * 1.15, toRadians(18))) {
      return false;
    }
  }

  return true;
}

export function placeTarget({
  markerAngle,
  direction = 1,
  speed = DEFAULT_RULES.initialSpeed,
  targetWidth = DEFAULT_RULES.initialTargetWidth,
  previousTargetAngle = null,
  rng = Math.random,
  rules = DEFAULT_RULES
}) {
  const minTravel = Math.min(getMinimumSpawnTravel(speed, targetWidth, rules), TAU - rules.minSeparation);
  const maxTravel = Math.max(minTravel, TAU - rules.minSeparation);
  const safeRng = typeof rng === "function" ? rng : Math.random;

  for (let attempt = 0; attempt < 96; attempt += 1) {
    const travel = minTravel + safeRng() * (maxTravel - minTravel);
    const candidate = normalizeAngle(markerAngle + Math.sign(direction || 1) * travel);
    if (isFairTargetPlacement({
      markerAngle,
      targetAngle: candidate,
      direction,
      speed,
      targetWidth,
      previousTargetAngle,
      rules
    })) {
      return candidate;
    }
  }

  const fallbackTravel = Math.min(maxTravel, minTravel + rules.minSeparation * 0.55);
  return normalizeAngle(markerAngle + Math.sign(direction || 1) * fallbackTravel);
}

export function canTransition(fromState, toState) {
  return fromState === toState || Boolean(LEGAL_TRANSITIONS[fromState]?.includes(toState));
}

export function transitionState(fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new Error(`Illegal game state transition: ${fromState} -> ${toState}`);
  }

  return toState;
}

export class LockPopEngine {
  constructor(options = {}) {
    this.rules = { ...DEFAULT_RULES, ...options.rules };
    this.rng = typeof options.rng === "function" ? options.rng : Math.random;
    this.initialMarkerAngle = options.initialMarkerAngle;
    this.state = GameState.READY;
    this.resetRun(false);
  }

  resetRun(keepState = true) {
    this.score = 0;
    this.hitCount = 0;
    this.direction = this.rng() < 0.5 ? -1 : 1;
    this.markerAngle = normalizeAngle(
      typeof this.initialMarkerAngle === "number" ? this.initialMarkerAngle : this.rng() * TAU
    );
    this.speed = calculateSpeed(this.hitCount, this.rules);
    this.targetWidth = calculateTargetWidth(this.hitCount, this.rules);
    this.targetAngle = placeTarget({
      markerAngle: this.markerAngle,
      direction: this.direction,
      speed: this.speed,
      targetWidth: this.targetWidth,
      rng: this.rng,
      rules: this.rules
    });
    this.countdownRemaining = this.rules.countdownSeconds;
    this.lastEvent = null;

    if (!keepState) {
      this.state = GameState.READY;
    }
  }

  setState(nextState) {
    this.state = transitionState(this.state, nextState);
    return this.state;
  }

  startRun() {
    if (this.state === GameState.PAUSED) {
      return this.resume();
    }

    if (this.state === GameState.READY || this.state === GameState.GAME_OVER) {
      this.resetRun(true);
      this.countdownRemaining = this.rules.countdownSeconds;
      this.setState(GameState.COUNTDOWN);
      this.lastEvent = { type: "start" };
      return true;
    }

    return false;
  }

  restartRun() {
    if (this.state !== GameState.READY) {
      this.setState(GameState.READY);
    }

    return this.startRun();
  }

  pause(reason = "manual") {
    if (this.state !== GameState.PLAYING && this.state !== GameState.COUNTDOWN) {
      return false;
    }

    this.setState(GameState.PAUSED);
    this.lastEvent = { type: "pause", reason };
    return true;
  }

  resume() {
    if (this.state !== GameState.PAUSED) {
      return false;
    }

    this.countdownRemaining = this.rules.countdownSeconds;
    this.setState(GameState.COUNTDOWN);
    this.lastEvent = { type: "resume" };
    return true;
  }

  update(deltaSeconds) {
    const delta = Math.max(0, Math.min(Number(deltaSeconds) || 0, this.rules.maxFrameDelta));

    if (this.state === GameState.COUNTDOWN) {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - delta);
      if (this.countdownRemaining <= 0) {
        this.setState(GameState.PLAYING);
        this.lastEvent = { type: "play" };
      }
    } else if (this.state === GameState.PLAYING) {
      this.markerAngle = normalizeAngle(this.markerAngle + this.direction * this.speed * delta);
    }

    return this.getSnapshot();
  }

  attemptHit() {
    if (this.state !== GameState.PLAYING) {
      return { accepted: false, state: this.state };
    }

    const perfect = isPerfectHit(this.markerAngle, this.targetAngle, this.targetWidth, this.rules);
    const hit = perfect || isTargetHit(this.markerAngle, this.targetAngle, this.targetWidth);

    if (!hit) {
      this.setState(GameState.GAME_OVER);
      this.lastEvent = {
        type: "miss",
        markerAngle: this.markerAngle,
        targetAngle: this.targetAngle
      };
      return { accepted: true, hit: false, state: this.state };
    }

    const previousTargetAngle = this.targetAngle;
    const quality = perfect ? "perfect" : "hit";
    const delta = getScoreDelta(quality);
    this.score = applyScore(this.score, quality);
    this.hitCount += 1;
    this.direction *= -1;
    this.speed = calculateSpeed(this.hitCount, this.rules);
    this.targetWidth = calculateTargetWidth(this.hitCount, this.rules);
    this.targetAngle = placeTarget({
      markerAngle: this.markerAngle,
      direction: this.direction,
      speed: this.speed,
      targetWidth: this.targetWidth,
      previousTargetAngle,
      rng: this.rng,
      rules: this.rules
    });
    this.lastEvent = {
      type: "hit",
      quality,
      perfect,
      delta,
      markerAngle: this.markerAngle,
      targetAngle: previousTargetAngle,
      nextTargetAngle: this.targetAngle
    };

    return {
      accepted: true,
      hit: true,
      perfect,
      quality,
      delta,
      state: this.state
    };
  }

  getSnapshot() {
    return {
      state: this.state,
      score: this.score,
      hitCount: this.hitCount,
      markerAngle: this.markerAngle,
      targetAngle: this.targetAngle,
      targetWidth: this.targetWidth,
      perfectWidth: getPerfectTargetWidth(this.targetWidth, this.rules),
      direction: this.direction,
      speed: this.speed,
      countdownRemaining: this.countdownRemaining,
      countdownSeconds: this.rules.countdownSeconds,
      maxFrameDelta: this.rules.maxFrameDelta,
      lastEvent: this.lastEvent
    };
  }
}
