import test from "node:test";
import assert from "node:assert/strict";
import {
  InputStateMachine,
  actionsFromMoveVector,
  actionsFromTurnVector
} from "../games/nightfall/src/input-state.js";

function createHarness() {
  const events = [];
  const input = new InputStateMachine({
    dispatch(event) {
      events.push(event);
    },
    cleanup(reason) {
      events.push({ type: "cleanup", reason });
    }
  });
  return { input, events };
}

test("NIGHTFALL input presses and releases keys once", () => {
  const { input, events } = createHarness();

  assert.equal(input.press("forward"), true);
  assert.equal(input.press("forward"), false);
  assert.deepEqual(input.getActiveActions(), ["forward"]);
  assert.equal(input.release("forward"), true);
  assert.equal(input.release("forward"), false);

  assert.deepEqual(events.map(event => `${event.type}:${event.action ?? ""}`), [
    "down:forward",
    "up:forward"
  ]);
});

test("NIGHTFALL input supports simultaneous pointer combinations", () => {
  const { input } = createHarness();

  input.setPointerActions(1, ["forward", "strafeLeft"]);
  input.setPointerActions(2, ["turnRight", "fire"]);

  assert.deepEqual(new Set(input.getActiveActions()), new Set([
    "forward",
    "strafeLeft",
    "turnRight",
    "fire"
  ]));

  input.clearPointer(1);
  assert.deepEqual(new Set(input.getActiveActions()), new Set(["turnRight", "fire"]));
});

test("NIGHTFALL input does not release an action still held by another pointer", () => {
  const { input, events } = createHarness();

  input.setPointerActions(1, ["fire"]);
  input.setPointerActions(2, ["fire"]);
  input.clearPointer(1);

  assert.deepEqual(input.getActiveActions(), ["fire"]);
  assert.equal(events.filter(event => event.type === "up" && event.action === "fire").length, 0);

  input.clearPointer(2);
  assert.deepEqual(input.getActiveActions(), []);
  assert.equal(events.filter(event => event.type === "up" && event.action === "fire").length, 1);
});

test("NIGHTFALL input cleanup releases all stuck controls", () => {
  const { input, events } = createHarness();

  input.setPointerActions(1, ["forward", "fire"]);
  input.toggleRunLock();
  input.clearAll("blur");

  assert.deepEqual(input.getActiveActions(), []);
  assert.equal(events.at(-1).type, "cleanup");
  assert.equal(events.at(-1).reason, "blur");
  assert.equal(events.filter(event => event.type === "up").length, 3);
});

test("NIGHTFALL vector helpers map pads to movement and turning", () => {
  assert.deepEqual(actionsFromMoveVector(-0.7, -0.8), ["forward", "strafeLeft"]);
  assert.deepEqual(actionsFromMoveVector(0.8, 0.7), ["backward", "strafeRight"]);
  assert.deepEqual(actionsFromMoveVector(0.1, 0.1), []);
  assert.deepEqual(actionsFromTurnVector(-0.6), ["turnLeft"]);
  assert.deepEqual(actionsFromTurnVector(0.6), ["turnRight"]);
  assert.deepEqual(actionsFromTurnVector(0.05), []);
});
