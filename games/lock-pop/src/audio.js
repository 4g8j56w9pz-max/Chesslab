export class ArcadeAudio {
  constructor({ muted = false } = {}) {
    this.context = null;
    this.muted = Boolean(muted);
    this.masterGain = null;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.22, this.context.currentTime, 0.012);
    }
  }

  async unlock() {
    if (this.muted) {
      return false;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return false;
    }

    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.22;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context.state === "running";
  }

  async playStart() {
    if (!await this.unlock()) {
      return;
    }

    const start = this.context.currentTime;
    this.tone({ frequency: 220, type: "triangle", start, duration: 0.08, gain: 0.28 });
    this.tone({ frequency: 330, type: "triangle", start: start + 0.07, duration: 0.1, gain: 0.22 });
  }

  async playHit() {
    if (!await this.unlock()) {
      return;
    }

    const start = this.context.currentTime;
    this.tone({ frequency: 460, type: "square", start, duration: 0.055, gain: 0.16 });
    this.tone({ frequency: 690, type: "sine", start: start + 0.035, duration: 0.075, gain: 0.18 });
  }

  async playPerfect() {
    if (!await this.unlock()) {
      return;
    }

    const start = this.context.currentTime;
    this.tone({ frequency: 520, type: "triangle", start, duration: 0.06, gain: 0.2 });
    this.tone({ frequency: 780, type: "triangle", start: start + 0.045, duration: 0.08, gain: 0.18 });
    this.tone({ frequency: 1040, type: "sine", start: start + 0.1, duration: 0.085, gain: 0.13 });
  }

  async playMiss() {
    if (!await this.unlock()) {
      return;
    }

    const start = this.context.currentTime;
    this.tone({ frequency: 140, type: "sawtooth", start, duration: 0.16, gain: 0.18, slideTo: 72 });
    this.noise({ start, duration: 0.11, gain: 0.08 });
  }

  tone({ frequency, type, start, duration, gain, slideTo = null }) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    }

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  noise({ start, duration, gain }) {
    const sampleRate = this.context.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.context.createBuffer(1, frameCount, sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 880;
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}
