import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RULES,
  GameState,
  LockPopEngine,
  applyScore,
  calculateSpeed,
  calculateTargetWidth,
  canTransition,
  getMinimumSpawnTravel,
  isFairTargetPlacement,
  isPerfectHit,
  isTargetHit,
  normalizeAngle,
  placeTarget,
  shortestAngularDistance,
  toRadians,
  transitionState,
  travelDistanceInDirection
} from "../games/lock-pop/src/game-engine.js";

const EPSILON = 1e-9;

function closeTo(actual, expected, epsilon = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} was not within ${epsilon} of ${expected}`);
}

test("normalizes angles into one full positive turn", () => {
  closeTo(normalizeAngle(0), 0);
  closeTo(normalizeAngle(Math.PI * 2), 0);
  closeTo(normalizeAngle(-Math.PI / 2), Math.PI * 1.5);
  closeTo(normalizeAngle(Math.PI * 5), Math.PI);
});

test("detects target hits across the 0 degree boundary", () => {
  const targetAngle = toRadians(359);
  const markerAngle = toRadians(1);
  const width = toRadians(6);

  assert.equal(isTargetHit(markerAngle, targetAngle, width), true);
  closeTo(shortestAngularDistance(markerAngle, targetAngle), toRadians(2));
});

test("rejects misses immediately outside the target", () => {
  const targetAngle = 0;
  const width = toRadians(10);
  const justOutside = toRadians(5.1);

  assert.equal(isTargetHit(justOutside, targetAngle, width), false);
});

test("detects the narrower perfect region inside a target", () => {
  const targetAngle = 0;
  const width = toRadians(30);

  assert.equal(isPerfectHit(toRadians(5), targetAngle, width), true);
  assert.equal(isPerfectHit(toRadians(6), targetAngle, width), false);
  assert.equal(isTargetHit(toRadians(6), targetAngle, width), true);
});

test("target placement enforces marker separation and reaction travel", () => {
  const speed = DEFAULT_RULES.maxSpeed;
  const targetWidth = DEFAULT_RULES.minTargetWidth;
  const targetAngle = placeTarget({
    markerAngle: 0,
    direction: 1,
    speed,
    targetWidth,
    rng: () => 0,
    rules: DEFAULT_RULES
  });

  assert.ok(shortestAngularDistance(0, targetAngle) >= DEFAULT_RULES.minSeparation);
  assert.ok(travelDistanceInDirection(0, targetAngle, 1) >= getMinimumSpawnTravel(speed, targetWidth, DEFAULT_RULES) - EPSILON);
  assert.equal(isFairTargetPlacement({
    markerAngle: 0,
    targetAngle,
    direction: 1,
    speed,
    targetWidth,
    rules: DEFAULT_RULES
  }), true);
});

test("speed curve is smooth and capped", () => {
  assert.equal(calculateSpeed(0, DEFAULT_RULES), DEFAULT_RULES.initialSpeed);
  assert.ok(calculateSpeed(5, DEFAULT_RULES) > calculateSpeed(4, DEFAULT_RULES));
  assert.ok(calculateSpeed(100000, DEFAULT_RULES) <= DEFAULT_RULES.maxSpeed);
  closeTo(calculateSpeed(100000, DEFAULT_RULES), DEFAULT_RULES.maxSpeed);
});

test("target width curve never drops below its floor", () => {
  assert.equal(calculateTargetWidth(0, DEFAULT_RULES), DEFAULT_RULES.initialTargetWidth);
  assert.ok(calculateTargetWidth(8, DEFAULT_RULES) < calculateTargetWidth(7, DEFAULT_RULES));
  assert.ok(calculateTargetWidth(100000, DEFAULT_RULES) >= DEFAULT_RULES.minTargetWidth);
  closeTo(calculateTargetWidth(100000, DEFAULT_RULES), DEFAULT_RULES.minTargetWidth);
});

test("score calculation awards normal and perfect hits correctly", () => {
  assert.equal(applyScore(0, "hit"), 1);
  assert.equal(applyScore(1, "perfect"), 3);
});

test("legal state transitions are explicit", () => {
  assert.equal(canTransition(GameState.READY, GameState.COUNTDOWN), true);
  assert.equal(canTransition(GameState.READY, GameState.PLAYING), false);
  assert.equal(transitionState(GameState.PLAYING, GameState.GAME_OVER), GameState.GAME_OVER);
  assert.throws(() => transitionState(GameState.READY, GameState.PLAYING), /Illegal game state transition/);
});

test("engine supports start, countdown, pause, resume, and game over", () => {
  const engine = new LockPopEngine({
    initialMarkerAngle: 0,
    rng: () => 0.75,
    rules: {
      countdownSeconds: 0.01
    }
  });

  assert.equal(engine.state, GameState.READY);
  assert.equal(engine.startRun(), true);
  assert.equal(engine.state, GameState.COUNTDOWN);
  engine.update(0.01);
  assert.equal(engine.state, GameState.PLAYING);

  assert.equal(engine.pause(), true);
  assert.equal(engine.state, GameState.PAUSED);
  assert.equal(engine.resume(), true);
  assert.equal(engine.state, GameState.COUNTDOWN);
  engine.update(0.01);
  assert.equal(engine.state, GameState.PLAYING);

  engine.markerAngle = normalizeAngle(engine.targetAngle + engine.targetWidth);
  const result = engine.attemptHit();
  assert.equal(result.hit, false);
  assert.equal(engine.state, GameState.GAME_OVER);
});

test("large frame deltas are clamped while playing", () => {
  const engine = new LockPopEngine({
    initialMarkerAngle: 0,
    rng: () => 0.75,
    rules: {
      countdownSeconds: 0.01,
      maxFrameDelta: 0.05
    }
  });

  engine.startRun();
  engine.update(0.01);
  engine.markerAngle = 0;
  engine.speed = 2;
  engine.update(10);
  closeTo(engine.markerAngle, 0.1);
});
