import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cloudSpeechSupported, listenOnce, type CloudListen } from '../services/asr';

/**
 * One spoken answer, heard twice over.
 *
 * The Web Speech API is the cheap tier — it answers inside the browser, in every Chrome,
 * Edge and Safari — but it is the tier that breaks silently on Android tablets: the
 * constructor is there, `start()` is accepted, and then nothing ever happens because the
 * device has no Google speech service behind it. So the mic is treated as two attempts
 * rather than one call: if the browser engine never opens or reports a service it cannot
 * reach, the same reading is re-run on the worker (services/asr.ts) instead of the
 * student being left in front of a dead button.
 *
 * Every session also carries a start watchdog and a hard listen cap. Without them a
 * browser that never fires `onstart` looks exactly like a frozen screen.
 */

/** The slice of the Web Speech API this app needs — not in the DOM lib we compile against. */
interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: RecognitionAlternative;
}

interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<RecognitionResult>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/** Chrome and Edge ship it under two names; Safari 16+ ships the unprefixed one. */
const recogniserCtor = (): (new () => SpeechRecognitionLike) | null => {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
};

/** No `onstart` in this long → the engine is dead on this device; try the worker. */
const START_WATCHDOG_MS = 3200;
/** Safety stop, so one reading cannot hang "Listening…" forever. */
const MAX_LISTEN_MS = 12_000;

/**
 * Mic permission state when the browser exposes it, 'unknown' otherwise. A first-run
 * permission dialog delays `onstart`, and that must not be mistaken for a dead engine.
 */
const micPermissionState = async (): Promise<string> => {
  const permissions = (
    navigator as unknown as {
      permissions?: { query?: (descriptor: unknown) => Promise<{ state: string }> };
    }
  )?.permissions;
  if (!permissions?.query) return 'unknown';
  try {
    const status = await permissions.query({ name: 'microphone' });
    return status.state;
  } catch {
    return 'unknown';
  }
};

/** Everything that can go wrong with one reading, as a code the screen localises. */
export type SpeechError =
  /** Permission denied, no microphone, or an insecure page where the mic cannot open. */
  | 'blocked'
  /** The recognition service could not be reached. */
  | 'network'
  /** The browser engine accepted `start()` but never opened the mic. */
  | 'unresponsive'
  | 'start-failed'
  /** The page is on plain http, where both browsers refuse to open a mic. */
  | 'insecure'
  /** The mic opened, but nothing was said. */
  | 'nothing'
  /** The worker's daily voice allowance is spent. */
  | 'limited';

export interface SpeechInput {
  /** False when neither tier can listen on this device. */
  supported: boolean;
  listening: boolean;
  /** A clip is being transcribed on the worker; the mic is already closed. */
  transcribing: boolean;
  error: SpeechError | null;
  start: () => void;
  stop: () => void;
  /** Drops the session and the error — used when the word changes. */
  reset: () => void;
}

/**
 * `onFinal` receives the best transcript plus the other hypotheses the engine offered;
 * a one-word answer is frequently a homophone, so the caller checks them all.
 */
export const useSpeechInput = (
  onFinal: (transcript: string, alternatives: string[]) => void,
): SpeechInput => {
  const Ctor = useMemo(recogniserCtor, []);
  const cloudOk = useMemo(cloudSpeechSupported, []);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  /** The browser engine has failed on this device — every later reading goes to the worker. */
  const browserDeadRef = useRef(false);
  /** The student ended this reading themselves, so it must not be retried automatically. */
  const stoppedRef = useRef(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const cloudRef = useRef<CloudListen | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const maxRef = useRef<number | null>(null);

  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);

  const clearTimers = useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (maxRef.current !== null) {
      window.clearTimeout(maxRef.current);
      maxRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    const cloud = cloudRef.current;
    cloudRef.current = null;
    cloud?.cancel();
  }, [clearTimers]);

  /** Tier 2: record one clip and have the worker transcribe it. */
  const beginCloud = useCallback(() => {
    teardown();
    setError(null);
    setTranscribing(false);

    const session = listenOnce(() => {
      if (cloudRef.current !== session) return;
      setListening(false);
      setTranscribing(true);
    });
    cloudRef.current = session;
    setListening(true);

    void session.outcome.then((result) => {
      if (cloudRef.current !== session) return;
      cloudRef.current = null;
      setListening(false);
      setTranscribing(false);

      if (result.kind === 'cancelled') return;
      if (result.kind === 'heard') {
        finalRef.current(result.transcript, []);
        return;
      }
      if (result.kind === 'mic-blocked') {
        setError('blocked');
        return;
      }
      if (result.kind === 'limited') {
        setError('limited');
        return;
      }
      if (result.kind === 'network') {
        setError('network');
        return;
      }
      setError('nothing');
    });
  }, [teardown]);

  const begin = useCallback(() => {
    // On http:// — a dev server reached by LAN IP, say — Chrome still exposes the
    // constructor but refuses the microphone. Say why instead of failing silently.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('insecure');
      return;
    }
    if (!Ctor || browserDeadRef.current) {
      if (cloudOk) {
        beginCloud();
        return;
      }
      setError('start-failed');
      return;
    }

    teardown();
    setError(null);
    setListening(false);
    setTranscribing(false);
    stoppedRef.current = false;

    let rec: SpeechRecognitionLike;
    try {
      rec = new Ctor();
    } catch {
      setError('start-failed');
      return;
    }
    recRef.current = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    // Homophones are the normal case for a single word: "wear" comes back as "where".
    rec.maxAlternatives = 5;

    let heardSomething = false;
    /** `onstart` fired: the engine really opened the mic. */
    let started = false;
    /** The engine reported a problem of its own, so `onend` is not a silent death. */
    let failed = false;

    rec.onstart = () => {
      if (recRef.current !== rec) return;
      started = true;
      clearTimers();
      setListening(true);
      maxRef.current = window.setTimeout(() => {
        if (recRef.current !== rec) return;
        try {
          rec.stop();
        } catch {
          /* already stopping */
        }
      }, MAX_LISTEN_MS);
    };

    rec.onresult = (event) => {
      if (recRef.current !== rec) return;
      let best = '';
      const alternatives: string[] = [];
      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        for (let j = 0; j < result.length; j += 1) {
          const text = result[j]?.transcript?.trim() ?? '';
          if (!text) continue;
          if (!best) best = text;
          if (!alternatives.includes(text)) alternatives.push(text);
        }
      }
      if (!best) return;
      heardSomething = true;
      clearTimers();
      setListening(false);
      finalRef.current(best, alternatives);
      // Some engines keep the session open after a final result; close it ourselves so
      // the mic is free for the next word.
      try {
        rec.stop();
      } catch {
        /* already stopping */
      }
    };

    rec.onerror = (event) => {
      if (recRef.current !== rec) return;
      failed = true;
      clearTimers();
      setListening(false);
      const code = event?.error ?? '';
      // Our own stop() aborts the session, which is not a failure.
      if (code === 'aborted') return;

      if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
        // A permission or device problem; the worker would need the same mic.
        setError('blocked');
        return;
      }
      if (code === 'no-speech') {
        setError('nothing');
        return;
      }
      // 'network', 'language-not-supported', 'bad-grammar' — the engine is present but
      // cannot do its job here (typical of Android tablets with no Google speech
      // service). Hand the next reading to the worker instead of failing the student.
      if (cloudOk) {
        browserDeadRef.current = true;
        beginCloud();
        return;
      }
      setError(code === 'network' ? 'network' : 'start-failed');
    };

    rec.onend = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      clearTimers();
      setListening(false);
      if (heardSomething) return;
      // Some Android builds accept `start()`, skip `onstart` entirely and end the
      // session straight away. That is a dead engine, not a quiet student.
      if (!started && !failed && !stoppedRef.current && cloudOk) {
        browserDeadRef.current = true;
        beginCloud();
        return;
      }
      setError((current) => current ?? 'nothing');
    };

    try {
      rec.start();
    } catch {
      recRef.current = null;
      if (cloudOk) {
        browserDeadRef.current = true;
        beginCloud();
        return;
      }
      setError('start-failed');
      return;
    }

    const checkStarted = () => {
      if (recRef.current !== rec) return;
      void micPermissionState().then((state) => {
        if (recRef.current !== rec) return;
        if (state === 'prompt') {
          // The permission dialog is still up — that is not a broken engine.
          watchdogRef.current = window.setTimeout(checkStarted, START_WATCHDOG_MS);
          return;
        }
        // Constructor present, `start()` accepted, mic never opened: the Android-tablet
        // case. Switch tiers rather than show a button that can never work.
        teardown();
        setListening(false);
        if (cloudOk) {
          browserDeadRef.current = true;
          beginCloud();
        } else {
          setError('unresponsive');
        }
      });
    };

    watchdogRef.current = window.setTimeout(checkStarted, START_WATCHDOG_MS);
  }, [Ctor, beginCloud, clearTimers, cloudOk, teardown]);

  /** Ends the reading and keeps what was said: the engine still delivers its result. */
  const stop = useCallback(() => {
    stoppedRef.current = true;
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
        return;
      } catch {
        /* fall through to the hard stop */
      }
    }
    // Worker tier: close the capture but let the clip upload and be transcribed.
    const cloud = cloudRef.current;
    if (cloud) {
      cloud.stop();
      return;
    }
    teardown();
    setListening(false);
    setTranscribing(false);
  }, [teardown]);

  /** Drops the session outright — a new card must not inherit the old one's result. */
  const reset = useCallback(() => {
    teardown();
    setListening(false);
    setTranscribing(false);
    setError(null);
  }, [teardown]);

  useEffect(
    () => () => {
      teardown();
    },
    [teardown],
  );

  return {
    supported: Boolean(Ctor) || cloudOk,
    listening,
    transcribing,
    error,
    start: begin,
    stop,
    reset,
  };
};
