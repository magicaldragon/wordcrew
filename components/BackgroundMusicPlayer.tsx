
import React, { useEffect, useRef, useState, useCallback } from 'react';
// BACKGROUND_MUSIC_URL is no longer used as a fallback here, App.tsx decides the URL.

interface BackgroundMusicPlayerProps {
  volume: number;
  musicUrl?: string | null; // Changed from customMusicUrl, can be null to stop.
}

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({ volume, musicUrl }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioSrcRef = useRef<string | null>(null); // Stores the src of the currently loaded audio
  const wasPlayingBeforeHiddenRef = useRef(false); // Track playback so it can resume after the tab becomes visible again
  const [userInteracted, setUserInteracted] = useState(false);
  const userInteractedRef = useRef(false); // Mirror of userInteracted, readable from stable lifecycle handlers

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

  useEffect(() => {
    const newAudioSrc = musicUrl; // The URL to play, determined by App.tsx
    let audioJustInitializedOrSrcChanged = false;

    // Case 1: No valid URL provided (or explicitly told to stop)
    if (!newAudioSrc || typeof newAudioSrc !== 'string' || newAudioSrc.trim() === '') {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      currentAudioSrcRef.current = null; // No valid source loaded
      // Optionally: if (audioRef.current) audioRef.current.src = ''; // To release resource fully, but can cause issues if not handled well
      return; // Stop further processing for this effect run
    }

    // Case 2: Audio element doesn't exist yet
    if (!audioRef.current) {
      audioRef.current = new Audio(newAudioSrc);
      audioRef.current.loop = true;
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

    // Apply volume (applies on initial load/change, or if only volume prop changed)
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }

    // Attempt to play if user has interacted
    if (userInteracted && audioRef.current) {
      if (audioJustInitializedOrSrcChanged || audioRef.current.paused) {
        // If src just changed OR if it's simply paused (e.g. volume changed while paused)
        playAudio();
      }
    }
  }, [volume, musicUrl, userInteracted, playAudio]);

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
      pauseAudio();
    };
  }, []);

  return null; // This component does not render anything visible
};
