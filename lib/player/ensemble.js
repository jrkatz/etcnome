import Click from "../noises/click.js";

export default class Ensemble {
  constructor() {
    this.clicks = new Map();
  }

  getSound(soundSpec, sampleRate) {
    const { tone, vol, instr } = soundSpec;
    const key = `${tone}|${vol}|${instr}|${sampleRate}`;
    let click = this.clicks.get(key);
    if (!click) {
      const pitch = 2000 / 2 ** tone;
      click = Click(pitch, 0.0001, 0.04, sampleRate);
      this.clicks.set(key, click);
    }
    return click;
  }
}
