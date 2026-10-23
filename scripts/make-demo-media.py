"""
Generates the demo instrumentals that ship with the site.

These are original royalty-free loops synthesised from scratch (no samples, no
third-party music) so the player, waveform and downloads all work out of the box.
Replace them with Young Silence's real masters from the Studio.

    python3 scripts/make-demo-media.py
"""
import math
import os
import struct
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "media", "audio")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- primitives
def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def adsr(n, a=0.01, d=0.1, s=0.6, r=0.2):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n)
    env = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False),
        np.linspace(1, s, d_n, endpoint=False),
        np.full(s_n, s),
        np.linspace(s, 0, r_n),
    ])
    if len(env) < n:
        env = np.pad(env, (0, n - len(env)))
    return env[:n]


def exp_env(n, decay=4.0):
    return np.exp(-decay * np.arange(n) / n)


def noise(n):
    return rng.standard_normal(n)


def lowpass(x, cutoff, resonance=0.0):
    """One-pole lowpass with optional feedback bite."""
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x)
    prev = 0.0
    for i, v in enumerate(x):
        prev = (1 - a) * v + a * prev
        y[i] = prev
    return y


def lowpass_fast(x, cutoff):
    """Zero-phase lowpass. FFT for long buffers, cascaded one-poles for short ones."""
    if len(x) > 200_000:
        spec = np.fft.rfft(x)
        freqs = np.fft.rfftfreq(len(x), 1 / SR)
        response = 1 / np.sqrt(1 + (freqs / max(1.0, cutoff)) ** 4)
        return np.fft.irfft(spec * response, n=len(x))
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.copy(x)
    for _ in range(2):
        out = np.empty_like(y)
        prev = 0.0
        for i, v in enumerate(y):
            prev = (1 - a) * v + a * prev
            out[i] = prev
        y = out
    return y


def highpass(x, cutoff):
    return x - lowpass_fast(x, cutoff)


def sine(freq, dur):
    return np.sin(2 * np.pi * freq * t_axis(dur))


def saw(freq, dur, detune=0.0):
    t = t_axis(dur)
    f = freq * (1 + detune)
    return 2 * ((f * t) % 1.0) - 1


def midi_hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def add(buf, start, sample, gain=1.0):
    """Mix a sample into a buffer at a start time in seconds."""
    i = int(start * SR)
    if i < 0:
        sample = sample[-i:]
        i = 0
    if i >= len(buf) or len(sample) == 0:
        return
    end = min(len(buf), i + len(sample))
    buf[i:end] += sample[: end - i] * gain


def reverb(x, mix=0.18, taps=((0.031, 0.5), (0.043, 0.42), (0.067, 0.34), (0.089, 0.26), (0.127, 0.18))):
    out = np.copy(x)
    for delay, gain in taps:
        d = int(delay * SR)
        tail = np.zeros_like(x)
        tail[d:] = x[:-d]
        out += tail * gain * mix
    return out


def delay(x, time_s, feedback=0.3, mix=0.25, repeats=4):
    out = np.copy(x)
    n = int(time_s * SR)
    for k in range(1, repeats + 1):
        seg = np.zeros_like(x)
        start = n * k
        if start >= len(x):
            break
        seg[start:] = x[:-start] * (feedback ** k)
        out += seg * mix
    return out


# ---------------------------------------------------------------- instruments
def kick(dur=0.5, f0=118, f1=44, punch=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq = f1 + (f0 - f1) * np.exp(-28 * t)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-6.5 * t) * punch
    click = highpass(noise(n), 1800) * np.exp(-160 * t) * 0.18
    return np.tanh((body + click) * 1.5)


def snare(dur=0.22):
    n = int(SR * dur)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 186 * t) * np.exp(-26 * t) * 0.5
    snap = highpass(noise(n), 1400) * np.exp(-24 * t)
    return np.tanh((body + snap * 0.8) * 1.2)


def clap(dur=0.28):
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for offset in (0.0, 0.011, 0.022, 0.034):
        i = int(offset * SR)
        env[i:] += np.exp(-38 * (t[: n - i])) * 0.8
    return highpass(noise(n), 900) * env * 0.6


def hat(dur=0.07, open_=False):
    n = int(SR * (dur if not open_ else dur * 3))
    t = np.arange(n) / SR
    return highpass(noise(n), 7000) * np.exp(-(55 if not open_ else 16) * t) * 0.4


def shaker(dur=0.06):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return highpass(noise(n), 5000) * np.sin(np.pi * t / dur) ** 2 * 0.22


def bass_note(freq, dur, gain=1.0, glide=None):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = freq if glide is None else glide + (freq - glide) * np.minimum(1, t / 0.09)
    phase = 2 * np.pi * np.cumsum(f0) / SR
    tone = np.sin(phase) * 0.8 + np.sin(2 * phase) * 0.18
    env = adsr(n, 0.008, 0.09, 0.72, 0.12)
    return np.tanh(tone * env * gain * 1.3)


def marimba(freq, dur=0.55, gain=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * freq * t) * np.exp(-7 * t)
    out += np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-12 * t) * 0.32
    out += np.sin(2 * np.pi * freq * 4.02 * t) * np.exp(-22 * t) * 0.12
    return out * gain * 0.5


def bell(freq, dur=1.6, gain=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * freq * t) * np.exp(-2.6 * t)
    out += np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-4.2 * t) * 0.28
    out += np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-6.5 * t) * 0.12
    return out * gain * 0.4


def pluck(freq, dur=0.9, gain=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    body = np.zeros(n)
    for k, amp in ((1, 1.0), (2, 0.32), (3, 0.16), (4, 0.08)):
        body += np.sin(2 * np.pi * freq * k * t) * amp
    return body * np.exp(-4.2 * t) * gain * 0.32


def pad(freqs, dur, gain=1.0, bright=0.18, attack=0.9):
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.004, 0.0, 0.005):
            out += saw(f, dur, detune=det)
    out /= max(1, len(freqs) * 3)
    out = lowpass_fast(out, 200 + 1100 * bright)
    env = adsr(n, attack, 0.5, 0.75, min(1.4, dur * 0.3))
    return out * env * gain * 0.5


def log_drum(freq, dur=0.34, gain=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * freq * t) * np.exp(-16 * t)
    out += np.sin(2 * np.pi * freq * 1.48 * t) * np.exp(-26 * t) * 0.3
    return out * gain * 0.6


def conga(freq, dur=0.26, gain=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) * np.exp(-19 * t) + highpass(noise(n), 2500) * np.exp(-70 * t) * 0.15) * gain


def tom(freq, dur=0.4, gain=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq_arr = freq * (1 + 0.6 * np.exp(-18 * t))
    phase = 2 * np.pi * np.cumsum(freq_arr) / SR
    return np.sin(phase) * np.exp(-9 * t) * gain


# ---------------------------------------------------------------- arrangement
def render(name, bpm, bars, groove, seconds):
    beats_per_bar = 4
    beat = 60 / bpm
    bar_len = beat * beats_per_bar
    total = bars * bar_len
    n = int(SR * seconds)
    left = np.zeros(n)
    right = np.zeros(n)

    def put(sample, at, gain=1.0, pan=0.0):
        l = sample * gain * (1 - max(0, pan))
        r = sample * gain * (1 + min(0, pan))
        add(left, at % total, l)
        add(right, at % total, r)

    for bar in range(bars + 1):
        base = bar * bar_len
        groove(put, base, bar, beat, bar_len)

    def finish(sig):
        sig = reverb(sig, mix=0.22)
        # gentle high shelf taming + soft clip
        sig = np.tanh(sig * 1.1) * 0.92
        fade = int(SR * 1.6)
        sig[: int(SR * 0.05)] *= np.linspace(0, 1, int(SR * 0.05))
        sig[-fade:] *= np.linspace(1, 0, fade) ** 1.4
        peak = np.max(np.abs(sig)) or 1
        return sig / peak * 0.89

    # stereo width via tiny haas delay
    d = int(0.008 * SR)
    right = np.concatenate([np.zeros(d), right[:-d]]) if d < n else right
    stereo = np.stack([finish(left), finish(right)], axis=1)
    path = os.path.join(OUT, f"{name}.wav")
    pcm = (np.clip(stereo, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {path}  {seconds}s")


# --- Accra Nights: 100bpm afro-fusion, Am - F - C - G
def accra_nights(put, base, bar, beat, bar_len):
    chords = [(57, (69, 72, 76)), (53, (65, 69, 72)), (48, (64, 67, 72)), (55, (67, 71, 74))]
    root, notes = chords[bar % 4]

    for i, offset in enumerate([0, 1.5, 2.5, 3.0]):
        put(kick(), base + offset * beat, 0.95 if i == 0 else 0.7)

    for offset in (1, 3):
        put(clap(), base + offset * beat, 0.5)

    for step in range(16):
        at = base + step * beat / 4
        put(shaker(), at, 0.5 if step % 2 == 0 else 0.3, pan=0.25)
        if step % 2 == 1:
            put(hat(), at, 0.3, pan=-0.2)

    put(bass_note(midi_hz(root - 12), beat * 1.4, 0.85), base + 0 * beat)
    put(bass_note(midi_hz(root - 12), beat * 0.7, 0.7), base + 1.75 * beat)
    put(bass_note(midi_hz(root), beat * 1.1, 0.7), base + 2.5 * beat)

    put(pad([midi_hz(x) for x in notes], bar_len * 0.98, 0.5, bright=0.35, attack=0.45), base)

    melody = [76, 74, 72, 69]
    if bar % 2 == 0:
        for i, (note, offset) in enumerate(zip(melody, (0.5, 1.0, 1.5, 2.0))):
            put(marimba(midi_hz(note + (12 if bar % 4 == 0 else 0)), 0.8, 0.7), base + offset * beat, pan=-0.15)
    else:
        for note, offset in zip((72, 76), (0.75, 1.25)):
            put(marimba(midi_hz(note), 0.7, 0.55), base + offset * beat, pan=-0.15)

    if bar % 4 == 3:
        put(tom(midi_hz(45), 0.5, 0.5), base + 3.5 * beat)
        put(tom(midi_hz(40), 0.5, 0.45), base + 3.75 * beat)


# --- Silence Speaks: 140bpm drill, Bm pad, sliding 808s
def silence_speaks(put, base, bar, beat, bar_len):
    # two-beat half time feel
    for offset in (0, 2):
        put(kick(0.6, 150, 38, 1.1), base + offset * beat, 0.95)
    put(snare(), base + 2 * beat, 0.55)
    for step in range(8):
        put(hat(0.05), base + step * beat / 2, 0.28 if step % 2 else 0.4, pan=0.2)

    bass_notes = [47, 45, 43, 50]
    f = midi_hz(bass_notes[bar % 4] - 12)
    put(bass_note(f, beat * 1.6, 1.0, glide=f * 0.82), base, pan=0.0)
    if bar % 2 == 1:
        put(bass_note(f * 1.122, beat * 0.9, 0.8, glide=f), base + 2 * beat)

    put(pad([midi_hz(59), midi_hz(62), midi_hz(66), midi_hz(71)], bar_len * 1.02, 0.42, bright=0.12, attack=0.7), base)

    if bar % 4 in (0, 2):
        for note, offset in zip((78, 74, 71, 69), (0, 0.75, 1.5, 2.25)):
            put(bell(midi_hz(note), 1.8, 0.5), base + offset * beat, pan=0.15)
    if bar % 4 == 3:
        put(bell(midi_hz(66), 2.4, 0.6), base + 3 * beat, pan=-0.1)


# --- Mama's Prayer: 76bpm, warm acoustic highlife
def mamas_prayer(put, base, bar, beat, bar_len):
    prog = [(48, (60, 64, 67, 71)), (55, (59, 62, 67, 71)), (53, (57, 60, 65, 69)), (48, (60, 64, 67, 72))]
    root, notes = prog[bar % 4]

    put(pad([midi_hz(x) for x in notes], bar_len * 1.05, 0.55, bright=0.22, attack=0.85), base)
    put(bass_note(midi_hz(root - 12), beat * 3.4, 0.55), base)
    put(kick(0.4, 90, 50, 0.6), base, 0.45)
    put(kick(0.4, 90, 50, 0.5), base + 2.5 * beat, 0.3)

    arp = [0, 2, 1, 3, 2, 1]
    for i, idx in enumerate(arp):
        note = notes[idx % len(notes)] + 12
        put(pluck(midi_hz(note), 1.2, 0.6), base + i * beat * 0.5, pan=-0.2 if i % 2 else 0.2)

    for step in range(8):
        put(shaker(), base + step * beat / 2, 0.16, pan=0.3)

    if bar % 4 == 3:
        for note, offset in zip((72, 71, 69), (2.0, 2.5, 3.0)):
            put(marimba(midi_hz(note), 1.0, 0.4), base + offset * beat, pan=-0.1)


# --- Kpanlogo Riddim: 116bpm percussion-led afrobeats
def kpanlogo(put, base, bar, beat, bar_len):
    root = 50  # D
    for i, offset in enumerate((0, 0.75, 2.0, 2.75)):
        put(kick(0.45, 110, 46, 0.9), base + offset * beat, 0.8 if i % 2 == 0 else 0.6)
    for offset in (1.0, 3.0):
        put(clap(), base + offset * beat, 0.45)
    for step in range(16):
        put(shaker(), base + step * beat / 4, 0.4 if step % 4 == 0 else 0.22, pan=0.3)
        if step % 4 == 2:
            put(hat(0.06, True), base + step * beat / 4, 0.3, pan=-0.25)

    pattern = [0, 3, 5, 3, 7, 5, 3, 0]
    scale = [0, 3, 5, 7, 10]
    for i, p in enumerate(pattern):
        note = root + 12 + scale[p % len(scale)]
        put(log_drum(midi_hz(note), 0.4, 0.55), base + i * beat * 0.5, pan=0.1 if i % 2 else -0.1)

    put(bass_note(midi_hz(root - 12), beat * 1.2, 0.7), base)
    put(bass_note(midi_hz(root - 12), beat * 0.8, 0.6), base + 1.5 * beat)
    put(bass_note(midi_hz(root - 5), beat * 0.9, 0.6), base + 2.5 * beat)

    put(conga(midi_hz(72), 0.3, 0.4), base + 1.5 * beat, pan=-0.3)
    put(conga(midi_hz(67), 0.3, 0.35), base + 3.25 * beat, pan=0.3)

    if bar % 4 == 3:
        put(tom(midi_hz(43), 0.45, 0.5), base + 2.75 * beat)
        put(tom(midi_hz(38), 0.5, 0.45), base + 3.0 * beat)


if __name__ == "__main__":
    render("accra-nights", 100, 17, accra_nights, 42)
    render("silence-speaks", 140, 22, silence_speaks, 38)
    render("mamas-prayer", 76, 14, mamas_prayer, 46)
    render("kpanlogo", 116, 16, kpanlogo, 34)
