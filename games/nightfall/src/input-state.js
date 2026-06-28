export const INPUT_BINDINGS = Object.freeze({
  forward: Object.freeze({ key: "w", code: "KeyW", keyCode: 87 }),
  backward: Object.freeze({ key: "s", code: "KeyS", keyCode: 83 }),
  strafeLeft: Object.freeze({ key: "a", code: "KeyA", keyCode: 65 }),
  strafeRight: Object.freeze({ key: "d", code: "KeyD", keyCode: 68 }),
  turnLeft: Object.freeze({ key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 }),
  turnRight: Object.freeze({ key: "ArrowRight", code: "ArrowRight", keyCode: 39 }),
  fire: Object.freeze({ key: "Control", code: "ControlRight", keyCode: 17 }),
  use: Object.freeze({ key: " ", code: "Space", keyCode: 32 }),
  run: Object.freeze({ key: "Shift", code: "ShiftRight", keyCode: 16 }),
  map: Object.freeze({ key: "Tab", code: "Tab", keyCode: 9 }),
  menu: Object.freeze({ key: "Escape", code: "Escape", keyCode: 27 })
});

export class InputStateMachine {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
    this.activeActions = new Set();
    this.pointerActions = new Map();
    this.runLocked = false;
  }

  press(action) {
    this.#assertAction(action);
    if (this.activeActions.has(action)) {
      return false;
    }

    this.activeActions.add(action);
    this.dispatcher?.dispatch?.({
      type: "down",
      action,
      binding: INPUT_BINDINGS[action]
    });
    return true;
  }

  release(action) {
    this.#assertAction(action);
    if (!this.activeActions.has(action)) {
      return false;
    }

    this.activeActions.delete(action);
    this.dispatcher?.dispatch?.({
      type: "up",
      action,
      binding: INPUT_BINDINGS[action]
    });
    return true;
  }

  setAction(action, isActive) {
    return isActive ? this.press(action) : this.release(action);
  }

  setPointerActions(pointerId, actions) {
    const normalizedActions = new Set(actions);
    const previousActions = this.pointerActions.get(pointerId) ?? new Set();

    for (const action of normalizedActions) {
      this.#assertAction(action);
      if (!previousActions.has(action)) {
        this.press(action);
      }
    }

    for (const action of previousActions) {
      if (!normalizedActions.has(action) && !this.#isActionHeldByAnotherPointer(pointerId, action)) {
        this.release(action);
      }
    }

    if (normalizedActions.size > 0) {
      this.pointerActions.set(pointerId, normalizedActions);
    } else {
      this.pointerActions.delete(pointerId);
    }
  }

  clearPointer(pointerId) {
    this.setPointerActions(pointerId, []);
  }

  toggleRunLock() {
    this.runLocked = !this.runLocked;
    this.setAction("run", this.runLocked);
    return this.runLocked;
  }

  clearAll(reason = "cleanup") {
    this.pointerActions.clear();
    this.runLocked = false;
    for (const action of [...this.activeActions]) {
      this.release(action);
    }
    this.dispatcher?.cleanup?.(reason);
  }

  getActiveActions() {
    return [...this.activeActions];
  }

  #isActionHeldByAnotherPointer(pointerId, action) {
    for (const [otherPointerId, actions] of this.pointerActions.entries()) {
      if (otherPointerId !== pointerId && actions.has(action)) {
        return true;
      }
    }
    return false;
  }

  #assertAction(action) {
    if (!INPUT_BINDINGS[action]) {
      throw new Error(`Unknown NIGHTFALL input action: ${action}`);
    }
  }
}

export function actionsFromMoveVector(x, y, threshold = 0.28) {
  const actions = [];
  if (y < -threshold) actions.push("forward");
  if (y > threshold) actions.push("backward");
  if (x < -threshold) actions.push("strafeLeft");
  if (x > threshold) actions.push("strafeRight");
  return actions;
}

export function actionsFromTurnVector(x, threshold = 0.24) {
  if (x < -threshold) return ["turnLeft"];
  if (x > threshold) return ["turnRight"];
  return [];
}
