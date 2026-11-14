
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AUDIO_DUCK_EVENT } from '../constants';
// BACKGROUND_MUSIC_URL is no longer used as a fallback here, App.tsx decides the URL.

interface BackgroundMusicPlayerProps {
  volume: number;
  musicUrl?: string | null; // Changed from customMusicUrl, can be null to stop.
  /** false turns the player into a one-track player that reports the end via `onEnded`. */
  loop?: boolean;
  /** Called when a non-looping track finishes; the app answers with the next URL. */
  onEnded?: () => void;
}

/** How far the loop drops while an announcer line is speaking. */
const DUCK_LEVEL = 0.25;
/** Length of the ease into a new level; long enough to hide the step, short enough to feel immediate. */
const LEVEL_RAMP_MS = 260;
const LEVEL_RAMP_STEPS = 8;

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({ volume, musicUrl, loop = true, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioSrcRef = useRef<string | null>(null); // Stores the src of the currently loaded audio
  const wasPlayingBeforeHiddenRef = useRef(false); // Track playback so it can resume after the tab becomes visible again
  const [userInteracted, setUserInteracted] = useState(false);
  const userInteractedRef = useRef(false); // Mirror of userInteracted, readable from stable lifecycle handlers
  // Announcer callouts duck the loop so the voice sits on top of the music instead
  // of competing with it — the same trick the Candy Crush narrator uses.
  const volumeRef = useRef(volume);
  const duckedRef = useRef(false);
  const duckTimerRef = useRef<number | null>(null);
  const levelTimerRef = useRef<number | null>(null);

  // Ease the loop into a new level. The game changes it on purpose (Rush Hour opens loud
  // and settles back to the bed) and a straight assignment is an audible step.
  const rampLevelTo = useCallback((audio: HTMLAudioElement, target: number) => {
    if (levelTimerRef.current !== null) window.clearInterval(levelTimerRef.current);
    const from = audio.volume;
    if (Math.abs(target - from) < 0.01) {
      audio.volume = target;
      levelTimerRef.current = null;
      return;
    }
    let step = 0;
    levelTimerRef.current = window.setInterval(() => {
      step++;
      const level = from + ((target - from) * step) / LEVEL_RAMP_STEPS;
      audio.volume = Math.min(1, Math.max(0, level));
      if (step >= LEVEL_RAMP_STEPS && levelTimerRef.current !== null) {
        window.clearInterval(levelTimerRef.current);
        levelTimerRef.current = null;
      }
    }, LEVEL_RAMP_MS / LEVEL_RAMP_STEPS);
  }, []);

  const playAudio = useCallback(async () => {
    if (audioRef.current && audioRef.current.paused && currentAudioSrcRef.current /* Ensure a valid source is loaded */) {
      try {
        await audioRef.current.play();
      } catch (error: any) {
        // Common non-critical errors during play attempts.
        if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
          console.warn("Background music play was prevented unexpectedly:", error.name, error.message);
        } else {
          // console.log("Background music play known issue (Abort/NotAllowed):", error.name);
        }
      }
    }
  }, []);

  // The element is created inside the effect below, so the end handler is attached there
  // once; the ref keeps it reading the latest callback without re-registering a listener.
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  const handleTrackEnded = useCallback(() => {
    if (!audioRef.current || audioRef.current.loop) return;
    onEndedRef.current?.();
  }, []);

  useEffect(() => {
    const newAudioSrc = musicUrl; // The URL to play, determined by App.tsx
    let audioJustInitializedOrSrcChanged = false;

    // Case 1: No valid URL provided (or explicitly told to stop)
    if (!newAudioSrc || typeof newAudioSrc !== 'string' || newAudioSrc.trim() === '') {
      // Silence the loop but keep the loaded source. Clearing `currentAudioSrcRef` here
      // made the very same URL count as "changed" the next time music was requested,
      // which re-assigned `src` and called load() — aborting the in-flight request
      // (net::ERR_ABORTED) and re-downloading a multi-MB file every time the player
      // passed through a silent screen (portal / landing). Pausing is enough.
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return; // Stop further processing for this effect run
    }

    // Case 2: Audio element doesn't exist yet
    if (!audioRef.current) {
      audioRef.current = new Audio(newAudioSrc);
      audioRef.current.loop = loop;
      audioRef.current.addEventListener('ended', handleTrackEnded);
      currentAudioSrcRef.current = newAudioSrc;
      audioJustInitializedOrSrcChanged = true;
    } 
    // Case 3: Audio element exists, but the source URL has changed
    else if (currentAudioSrcRef.current !== newAudioSrc) {
      audioRef.current.pause();
      audioRef.current.src = newAudioSrc;
      currentAudioSrcRef.current = newAudioSrc;
      audioRef.current.load(); // Important after changing src to ensure it's ready
      audioJustInitializedOrSrcChanged = true;
    }

    // Playlist mode is decided per screen, so the flag is re-applied on every change.
    audioRef.current.loop = loop;

    // Apply volume (on initial load, src change, or a plain volume change). A ducked
    // loop stays ducked until its timer restores it. A brand-new element sits at 1.0, so
    // the first assignment snaps; ramping from full scale would be a blast of sound.
    if (audioRef.current) {
      const target = duckedRef.current ? volume * DUCK_LEVEL : volume;
      if (audioJustInitializedOrSrcChanged || audioRef.current.paused) {
        audioRef.current.volume = target;
      } else {
        rampLevelTo(audioRef.current, target);
      }
    }

    // Attempt to play if user has interacted
    if (userInteracted && audioRef.current) {
      if (audioJustInitializedOrSrcChanged || audioRef.current.paused) {
        // If src just changed OR if it's simply paused (e.g. volume changed while paused)
        playAudio();
      }
    }
  }, [volume, musicUrl, loop, userInteracted, playAudio, rampLevelTo, handleTrackEnded]);

  // Keep the loop volume readable from the duck handler, and listen for announcer
  // callouts. Each callout re-arms the timer; when it expires the loop ramps back.
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const handleDuck = (event: Event) => {
      const audio = audioRef.current;
      if (!audio) return;
      const ms = (event as CustomEvent<{ ms?: number }>).detail?.ms ?? 1500;
      duckedRef.current = true;
      // Drop at once — the point of ducking is that the voice never has to wait — so an
      // in-flight level ramp must not keep writing over it.
      if (levelTimerRef.current !== null) {
        window.clearInterval(levelTimerRef.current);
        levelTimerRef.current = null;
      }
      audio.volume = volumeRef.current * DUCK_LEVEL;
      if (duckTimerRef.current !== null) window.clearTimeout(duckTimerRef.current);
      duckTimerRef.current = window.setTimeout(() => {
        duckedRef.current = false;
        duckTimerRef.current = null;
        if (audioRef.current) audioRef.current.volume = volumeRef.current;
      }, ms);
    };

    window.addEventListener(AUDIO_DUCK_EVENT, handleDuck);
    return () => {
      window.removeEventListener(AUDIO_DUCK_EVENT, handleDuck);
      if (duckTimerRef.current !== null) {
        window.clearTimeout(duckTimerRef.current);
        duckTimerRef.current = null;
      }
    };
  }, []);

  // Effect for handling the first user interaction to enable audio playback
  useEffect(() => {
    const handleFirstUserInteraction = () => {
      if (!userInteracted) { // Ensure this runs only once
        setUserInteracted(true);
        // playAudio(); // playAudio will be called by the main useEffect when userInteracted changes
      }
    };

    if (!userInteracted) {
      const eventOptions = { once: true, passive: true };
      document.addEventListener('click', handleFirstUserInteraction, eventOptions);
      document.addEventListener('keydown', handleFirstUserInteraction, eventOptions);
      document.addEventListener('touchstart', handleFirstUserInteraction, eventOptions);

      return () => {
        document.removeEventListener('click', handleFirstUserInteraction);
        document.removeEventListener('keydown', handleFirstUserInteraction);
        document.removeEventListener('touchstart', handleFirstUserInteraction);
      };
    }
  }, [userInteracted]); // Only re-run if userInteracted changes (which it does once)

  // Keep the ref in sync so the stable lifecycle handlers below can read it.
  useEffect(() => {
    userInteractedRef.current = userInteracted;
  }, [userInteracted]);

  // Effect to guarantee playback stops when the page is hidden, unloaded or the
  // component unmounts. Without this, a looping <audio> can keep the browser
  // process alive (and audible) even after every window/tab has been closed.
  useEffect(() => {
    const pauseAudio = () => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };

    const handlePageHide = () => {
      pauseAudio();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasPlayingBeforeHiddenRef.current = !!audioRef.current && !audioRef.current.paused;
        pauseAudio();
      } else if (document.visibilityState === 'visible' && wasPlayingBeforeHiddenRef.current) {
        // Resume only if the user had already enabled playback and music was playing.
        if (userInteractedRef.current && audioRef.current && currentAudioSrcRef.current) {
          audioRef.current.play().catch(() => { /* ignored: play may still be blocked */ });
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (levelTimerRef.current !== null) {
        window.clearInterval(levelTimerRef.current);
        levelTimerRef.current = null;
      }
      pauseAudio();
    };
  }, []);

  return null; // This component does not render anything visible
};
