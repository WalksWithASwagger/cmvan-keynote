// Per-slide audio orchestrator. Loads /data/audio-cues.json once, exposes
// play(slideId), pause(), stop(), state, and an EventTarget for status. The
// player is a single hidden <audio> shared across the page so multiple
// triggers don't fight each other.

const CUES_URL = "/data/audio-cues.json";

class AudioPlayer extends EventTarget {
  constructor() {
    super();
    this.cues = null;
    this.state = "idle"; // idle | loading | playing | paused | error | unsupported
    this.currentSlideId = null;
    this._audio = null;
    this._loaded = null;
  }

  async ensureLoaded() {
    if (this._loaded) return this._loaded;
    this._loaded = (async () => {
      try {
        const res = await fetch(CUES_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.cues = data.cues || {};
        return this.cues;
      } catch (err) {
        this.cues = {};
        this._setState("error");
        console.warn("[audio]", err);
        return {};
      }
    })();
    return this._loaded;
  }

  hasAudio(slideId) {
    if (!this.cues) return false;
    const c = this.cues[slideId];
    return !!(c && c.mp3Url);
  }

  cueFor(slideId) {
    return this.cues ? this.cues[slideId] : null;
  }

  async play(slideId) {
    await this.ensureLoaded();
    const cue = this.cueFor(slideId);
    if (!cue || !cue.mp3Url) {
      this._setState("unsupported", { slideId });
      return false;
    }
    if (!this._audio) this._initAudio();
    const sameTrack = this.currentSlideId === slideId && this._audio.src;
    if (!sameTrack) {
      this._audio.src = cue.mp3Url;
      this.currentSlideId = slideId;
    }
    try {
      this._setState("loading", { slideId });
      await this._audio.play();
      this._setState("playing", { slideId });
      return true;
    } catch (err) {
      this._setState("error", { slideId, err });
      return false;
    }
  }

  pause() {
    if (this._audio && !this._audio.paused) {
      this._audio.pause();
      this._setState("paused", { slideId: this.currentSlideId });
    }
  }

  stop() {
    if (this._audio) {
      this._audio.pause();
      this._audio.currentTime = 0;
    }
    this.currentSlideId = null;
    this._setState("idle");
  }

  _initAudio() {
    const a = document.createElement("audio");
    a.preload = "none";
    a.style.display = "none";
    document.body.appendChild(a);
    a.addEventListener("ended", () => this._setState("idle"));
    a.addEventListener("pause", () => {
      if (this.state === "playing") this._setState("paused");
    });
    a.addEventListener("error", () => this._setState("error"));
    this._audio = a;
  }

  _setState(state, detail = {}) {
    this.state = state;
    this.dispatchEvent(new CustomEvent("statechange", { detail: { state, ...detail } }));
  }
}

export const audioPlayer = new AudioPlayer();
