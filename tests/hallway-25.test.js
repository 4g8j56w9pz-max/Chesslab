import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Test the actual standalone file shipped by this repository, without importing
// source or dependencies from the private development project.
const html = readFileSync(new URL('../games/hallway-25/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
function engine() {
  const context = vm.createContext({ module: { exports: {} } });
  vm.runInContext(scripts[0], context, { filename: 'hallway-25-engine.js' });
  assert.equal(typeof context.module.exports, 'function');
  const game = new context.module.exports({ random: () => 0.4 });
  game.start();
  return game;
}
function warning(game, entity = game.deck[game.survived]) {
  game.deck[game.survived] = entity;
  game.setMoving(true); game.tick(2600);
  assert.equal(game.state, 'warning');
}
function pass(game) {
  warning(game);
  if (game.entity === 'A-120') game.setHidden(true);
  else game.setMoving(false);
  game.tick(game.remaining); game.tick(game.remaining);
}

test('mixed encounter deck wins exactly at25 and never counts a26th', () => {
  const game = engine();
  assert.equal(game.deck.length, 25);
  assert.equal(game.deck.filter(entity => entity === 'A-90').length, 13);
  assert.equal(game.deck.filter(entity => entity === 'A-120').length, 12);
  for (let count = 1; count <= 25; count++) {
    pass(game);
    assert.equal(game.survived, count);
    assert.equal(game.state, count === 25 ? 'won' : 'survived');
    if (count < 25) game.tick(1600);
  }
  const result = JSON.stringify(game.snapshot());
  game.tick(60000); game.setMoving(true); game.toggleHide();
  assert.equal(JSON.stringify(game.snapshot()), result);
});

test('A-90 deals90 once per encounter and a second encounter hit is fatal', () => {
  const game = engine(); warning(game, 'A-90'); game.tick(3200);
  assert.equal(game.health, 10); assert.equal(game.state, 'active');
  for (let i = 0; i < 100; i++) { game.setMoving(true); game.tick(1); }
  assert.equal(game.damageEvents, 1); assert.equal(game.health, 10);
  game.tick(1200); assert.equal(game.survived, 1); game.tick(1600);
  warning(game, 'A-90'); game.tick(3200);
  assert.equal(game.health, 0); assert.equal(game.state, 'lost');
  assert.equal(game.damageEvents, 2); assert.equal(game.survived, 1);
});

test('Hide expires at20000ms once, deals25, and rejects reentry for1000ms', () => {
  const game = engine(); game.setHidden(true); game.tick(15000);
  assert.equal(game.hideTimeLeft, 5000);
  for (let i = 0; i < 100; i++) game.setHidden(true);
  game.tick(4999); assert.equal(game.hidden, true); assert.equal(game.health, 100);
  game.tick(1);
  assert.equal(game.hidden, false); assert.equal(game.health, 75);
  assert.equal(game.hideExpulsions, 1); assert.equal(game.damageEvents, 1);
  assert.equal(game.hideCooldown, 1000); assert.equal(game.setHidden(true), false);
  game.tick(999); assert.equal(game.setHidden(true), false);
  game.tick(1); assert.equal(game.setHidden(true), true);
  assert.equal(game.hideTimeLeft, 20000);
});

test('four independent Hide expulsions reach0HP with no repeated or postdeath damage', () => {
  const game = engine();
  for (let count = 1; count <= 4; count++) {
    if (game.hideCooldown) game.tick(game.hideCooldown);
    game.setHidden(true); game.tick(20000);
    assert.equal(game.health, 100 - count * 25);
    assert.equal(game.damageEvents, count); assert.equal(game.hideExpulsions, count);
  }
  assert.equal(game.state, 'lost');
  const result = JSON.stringify(game.snapshot()); game.tick(60000); game.toggleHide();
  assert.equal(JSON.stringify(game.snapshot()), result);
});

test('pause freezes health and timers; restart resets all run state to100HP', () => {
  const game = engine(); game.setHidden(true); game.tick(20000); game.tick(1000);
  game.setHidden(true); game.tick(15000); game.togglePause();
  const result = JSON.stringify(game.snapshot());
  game.tick(60000); game.setMoving(true); game.toggleHide();
  assert.equal(JSON.stringify(game.snapshot()), result);
  game.restart();
  assert.equal(game.state, 'explore'); assert.equal(game.health, 100);
  assert.equal(game.paused, false); assert.equal(game.hidden, false);
  assert.equal(game.hideTimeLeft, 20000); assert.equal(game.hideCooldown, 0);
  assert.equal(game.damageEvents, 0); assert.equal(game.hideExpulsions, 0);
  assert.equal(game.damageNoticeTime, 0); assert.equal(game.survived, 0);
});

test('A-120 catches immediately even at100HP; a forced exit applies Hide damage first', () => {
  const outside = engine(); warning(outside, 'A-120'); outside.setMoving(false); outside.tick(4200);
  assert.equal(outside.state, 'lost'); assert.equal(outside.health, 100);
  const forced = engine(); warning(forced, 'A-120'); forced.setHidden(true);
  forced.hideTimeLeft = 5000; forced.tick(5000);
  assert.equal(forced.state, 'lost'); assert.equal(forced.health, 75);
  assert.equal(forced.damageEvents, 1); assert.match(forced.reason, /Hide.*A-120/);
});

test('fatal damage precedes the25th completion; a nonfatal A-90 hit may still win', () => {
  for (const entity of ['A-90', 'A-120']) {
    const game = engine(); game.survived = 24; game.health = 25;
    warning(game, entity); game.setHidden(true);
    const duration = entity === 'A-90' ? 4500 : 5800;
    game.hideTimeLeft = duration; game.tick(duration);
    assert.equal(game.state, 'lost'); assert.equal(game.health, 0); assert.equal(game.survived, 24);
  }
  const winner = engine(); winner.survived = 24; warning(winner, 'A-90'); winner.tick(4500);
  assert.equal(winner.state, 'won'); assert.equal(winner.health, 10); assert.equal(winner.survived, 25);
});

function ui() {
  class Target {
    constructor() { this.events = {}; }
    addEventListener(name, listener) { (this.events[name] ||= []).push(listener); }
    fire(name, detail = {}) {
      if (this.disabled && ['click', 'pointerdown'].includes(name)) return;
      const event = { code: '', target: this, repeat: false, button: 0, pointerId: 1,
        preventDefault() {}, ...detail };
      for (const listener of this.events[name] || []) listener(event);
    }
  }
  class Element extends Target {
    constructor() { super(); this.style = {}; this.dataset = {}; this.attributes = {}; this._text = ''; this.classList = { toggle() {} }; }
    get textContent() { return this._text; }
    set textContent(value) { this._text = String(value); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    append() {}
    setPointerCapture() {}
    getBoundingClientRect() { return { width: 1000, height: 500 }; }
  }
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const drawing = new Proxy({}, { get(target, key) { return key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : target[key] || (() => {}); },
    set(target, key, value) { target[key] = value; return true; } });
  elements.get('hall').getContext = () => drawing;
  const document = new Target(); document.hidden = false;
  document.getElementById = id => elements.get(id); document.createElement = () => new Element();
  let now = 0, next;
  const context = vm.createContext({ document, window: new Target(), console,
    performance: { now: () => now }, devicePixelRatio: 1, matchMedia: () => ({ matches: true }),
    ResizeObserver: class { observe() {} }, requestAnimationFrame: callback => { next = callback; } });
  vm.runInContext(scripts[0], context);
  vm.runInContext('const Base = HallwayEngine; HallwayEngine = class extends Base { constructor(...args) { super(...args); globalThis.gameUnderTest = this; } };', context);
  vm.runInContext(scripts.at(-1), context);
  return { elements, game: context.gameUnderTest,
    click(id) { elements.get(id).fire('click'); },
    key(code, repeat = false) { document.fire('keydown', { code, repeat }); },
    pointer(name) { elements.get('walk').fire(name); },
    step(milliseconds) { now += milliseconds; const callback = next; next = undefined; callback(now); } };
}

test('delivered keyboard and touch handlers update numeric and accessible health UI', () => {
  const page = ui(); assert.equal(page.elements.get('hp').textContent, '100');
  assert.equal(page.elements.get('hpbar').attributes['aria-valuenow'], '100');
  page.click('mainAction'); page.game.deck[0] = 'A-90';
  page.pointer('pointerdown'); page.step(2600); page.step(3200);
  assert.equal(page.elements.get('hp').textContent, '10');
  assert.equal(page.elements.get('hpfill').style.transform, 'scaleX(0.1)');
  page.key('KeyW'); page.key('KeyW', true); assert.equal(page.game.damageEvents, 1);
  page.pointer('pointerup'); page.key('KeyR'); assert.equal(page.elements.get('hp').textContent, '100');
  page.key('KeyH'); page.step(20000);
  assert.equal(page.elements.get('hp').textContent, '75');
  assert.equal(page.elements.get('hideNotice').hidden, false);
  page.key('KeyP'); page.step(20000); assert.equal(page.game.health, 75);
  assert.equal(page.game.paused, true);
});

test('standalone game scripts parse and contain readable controls without external APIs', () => {
  assert.ok(scripts.length >= 2);
  for (const [index, script] of scripts.entries()) assert.doesNotThrow(() => new vm.Script(script, { filename: `inline-${index}.js` }));
  assert.match(html, /name="viewport"/); assert.match(html, /prefers-reduced-motion/);
  for (const id of ['count', 'hp', 'hpbar', 'pause', 'restart', 'walk', 'hide']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /HOLD TO WALK/); assert.match(html, /H\s*\/\s*E/);
  assert.match(html, /A-90/); assert.match(html, /90 HP/); assert.match(html, /A-120/);
  assert.match(html, /20 seconds/); assert.match(html, /25 damage/);
  assert.doesNotMatch(html, /<script[^>]+src\s*=|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\//i);
});

test('service worker refreshes the old arcade cache and precaches both Hallway25 routes', async () => {
  const worker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  const handlers = new Map(), deleted = [];
  let cacheName, shell, skipped = false, claimed = false, pending;
  const context = vm.createContext({
    self: {
      addEventListener(name, handler) { handlers.set(name, handler); },
      skipWaiting() { skipped = true; },
      clients: { claim() { claimed = true; } }
    },
    caches: {
      async open(name) { cacheName = name; return { async addAll(paths) { shell = Array.from(paths); } }; },
      async keys() { return ['midnight-games-v23', cacheName]; },
      async delete(name) { deleted.push(name); return true; }
    }
  });
  vm.runInContext(worker, context, { filename: 'service-worker.js' });
  handlers.get('install')({ waitUntil(work) { pending = work; } });
  await pending;
  assert.notEqual(cacheName, 'midnight-games-v23');
  assert.match(cacheName, /^midnight-games-v\d+$/);
  assert.ok(shell.includes('./index.html'));
  for (const route of ['./games/hallway-25/', './games/hallway-25/index.html']) {
    assert.equal(shell.filter(path => path === route).length, 1);
  }
  assert.equal(skipped, true);
  handlers.get('activate')({ waitUntil(work) { pending = work; } });
  await pending;
  assert.deepEqual(deleted, ['midnight-games-v23']);
  assert.equal(claimed, true);
});
