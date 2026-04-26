let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
};

class RingtonePlayer {
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private intervalId: number | null = null;
  private isPlaying = false;

  stop() {
    this.isPlaying = false;
    this.oscillators.forEach(o => {
      try { o.stop(); o.disconnect(); } catch {}
    });
    this.gains.forEach(g => {
      try { g.disconnect(); } catch {}
    });
    this.oscillators = [];
    this.gains = [];
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  playIncomingRingtone() {
    this.stop();
    this.isPlaying = true;

    const playPattern = () => {
      if (!this.isPlaying) return;
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const notes = [
          { freq: 784, dur: 0.15 },
          { freq: 988, dur: 0.15 },
          { freq: 1175, dur: 0.2 },
          { freq: 988, dur: 0.15 },
          { freq: 784, dur: 0.25 },
        ];

        let offset = 0;
        notes.forEach(({ freq, dur }) => {
          if (!this.isPlaying) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, ctx.currentTime + offset);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + dur - 0.03);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + dur + 0.01);
          this.oscillators.push(osc);
          this.gains.push(gain);
          offset += dur + 0.03;
        });
      } catch {}
    };

    playPattern();
    this.intervalId = window.setInterval(() => {
      if (!this.isPlaying) {
        if (this.intervalId !== null) clearInterval(this.intervalId);
        return;
      }
      playPattern();
    }, 2200);
  }

  playOutgoingRingtone() {
    this.stop();
    this.isPlaying = true;

    const playTone = () => {
      if (!this.isPlaying) return;
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + 1.0);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.1);
        this.oscillators.push(osc);
        this.gains.push(gain);
      } catch {}
    };

    playTone();
    this.intervalId = window.setInterval(() => {
      if (!this.isPlaying) {
        if (this.intervalId !== null) clearInterval(this.intervalId);
        return;
      }
      playTone();
    }, 3000);
  }

  playNotificationSound() {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }
}

export const incomingRingtone = new RingtonePlayer();
export const outgoingRingtone = new RingtonePlayer();
export const notificationSound = new RingtonePlayer();
