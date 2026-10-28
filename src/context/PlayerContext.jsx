import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { canPlayOnSite } from '../lib/streaming';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const counted = useRef(new Set());
  const queueRef = useRef([]);
  const currentRef = useRef(null);
  const advanceRef = useRef(() => {});
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = Number(localStorage.getItem('ys:volume'));
    return Number.isFinite(saved) && saved > 0 ? saved : 0.85;
  });
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  queueRef.current = queue;
  currentRef.current = current;

  const remember = (track) => {
    if (!counted.current.has(track.id)) {
      counted.current.add(track.id);
      api.countPlay(track.id);
    }
  };

  const startTrack = useCallback((track) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(track);
    currentRef.current = track;
    setError('');
    setTime(0);
    setDuration(track.duration || 0);
    audio.src = track.streamUrl || `/api/stream/${track.id}`;
    const result = audio.play();
    if (result?.catch) result.catch(() => setError('Tap play once more to start the audio.'));
    remember(track);
  }, []);

  const advance = useCallback(
    (direction) => {
      const audio = audioRef.current;
      const list = queueRef.current.length ? queueRef.current : currentRef.current ? [currentRef.current] : [];
      if (!list.length) return;
      const idx = list.findIndex((t) => t.id === currentRef.current?.id);
      const nextIdx = (idx + direction + list.length) % list.length;
      const nextTrack = list[nextIdx];
      if (!nextTrack) return;
      startTrack(nextTrack);
    },
    [startTrack]
  );
  advanceRef.current = advance;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = Number(localStorage.getItem('ys:volume')) || 0.85;
    audioRef.current = audio;

    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => advanceRef.current(1);
    const onError = () => {
      if (!audio.src) return;
      setPlaying(false);
      setError('This track could not be played. Try again.');
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const play = useCallback(
    (track, list) => {
      const audio = audioRef.current;
      if (!audio || !canPlayOnSite(track)) return;
      if (list) setQueue(list.filter(canPlayOnSite));
      if (currentRef.current?.id === track.id) {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      startTrack(track);
    },
    [startTrack]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((value) => {
    const audio = audioRef.current;
    const v = Math.max(0, Math.min(1, value));
    if (audio) {
      audio.volume = v;
      audio.muted = false;
    }
    setVolumeState(v);
    setMuted(v === 0);
    localStorage.setItem('ys:volume', String(v));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setCurrent(null);
    currentRef.current = null;
    setTime(0);
    setDuration(0);
    setPlaying(false);
  }, []);

  // media session (lock-screen / bluetooth controls)
  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.title,
      artist: 'Young Silence',
      album: current.genre || 'Young Silence',
      artwork: current.cover ? [{ src: current.cover, sizes: '1024x1024', type: 'image/jpeg' }] : [],
    });
    try {
      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => advanceRef.current(-1));
      navigator.mediaSession.setActionHandler('nexttrack', () => advanceRef.current(1));
    } catch {
      /* unsupported */
    }
  }, [current]);

  const value = useMemo(
    () => ({
      current,
      playing,
      time,
      duration,
      volume,
      muted,
      error,
      queue,
      play,
      toggle,
      next: () => advanceRef.current(1),
      previous: () => advanceRef.current(-1),
      seek,
      setVolume,
      toggleMute,
      stop,
      isCurrent: (id) => current?.id === id,
    }),
    [current, playing, time, duration, volume, muted, error, queue, play, toggle, seek, setVolume, toggleMute, stop]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
