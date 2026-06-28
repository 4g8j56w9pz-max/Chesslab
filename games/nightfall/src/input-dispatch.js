function defineLegacyKeyValue(event, property, value) {
  try {
    Object.defineProperty(event, property, { get: () => value });
  } catch {
    // Some browsers expose these as non-configurable; modern SDL paths still use key/code.
  }
}

export class BrowserInputDispatcher {
  constructor({ targetWindow = window } = {}) {
    this.targetWindow = targetWindow;
  }

  dispatch({ type, binding }) {
    const eventType = type === "down" ? "keydown" : "keyup";
    const event = new this.targetWindow.KeyboardEvent(eventType, {
      key: binding.key,
      code: binding.code,
      bubbles: true,
      cancelable: true,
      repeat: false,
      ctrlKey: binding.keyCode === 17,
      shiftKey: binding.keyCode === 16
    });

    defineLegacyKeyValue(event, "keyCode", binding.keyCode);
    defineLegacyKeyValue(event, "which", binding.keyCode);
    defineLegacyKeyValue(event, "charCode", 0);
    this.targetWindow.dispatchEvent(event);
  }

  cleanup() {}
}
