// Server-side speech recognition — the fallback tier.
//
// The Web Speech API answers inside the browser and covers Chrome, Edge and Safari,
// but Firefox and older Android WebViews ship no `SpeechRecognition` at all, and on
// those devices the mic used to be dead. Here the answer is recorded in the page and
// posted to the WordCrew worker, which runs Whisper on Cloudflare's edge.
//
// Only browsers missing the Web Speech API take this route, so the free Workers AI
// allocation normally covers every call: a Chrome or Safari player never sends audio
// anywhere. A clip stops as soon as the player has spoken and gone quiet, which for a
// one-word answer is about a second, so most uploads are a few kB. The hard cap below
// is the ceiling, not the usual length.

/**
 * Hard cap on a single capture. One word takes about a second; six seconds is a
 * generous ceiling for a hesitant speaker and the most audio this client can ever
 * put on the account's bill.
 */
const MAX_CLIP_MS = 6000;

/**
 * Silence that ends a clip early. Long enough that a pause between the words of a
 * two-word answer ("ice cream") is not mistaken for the end of it.
 */
const SILENCE_MS = 1000;

/** How often the level meter is read while recording. */
const VAD_POLL_MS = 100;

/**
 * RMS below this counts as room tone. Deliberately low: cutting a quiet speaker off
 * costs an answer, while a few hundred milliseconds of silence costs a fraction of
 * a neuron.
 */
const SPEECH_RMS = 0.015;

/** Opus in WebM first: the smallest payload, and the widest browser support. */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

/**
 * Mono speech at 32 kbit/s is transparent to Whisper and keeps a full six-second clip
 * under 24 kB — a fraction of the bitrate the browser would pick on its own.
 */
const AUDIO_BITS_PER_SECOND = 32_000;

let cachedMime: string | undefined;

const audioMime = (): string => {
  if (cachedMime === undefined) {
    cachedMime =
      typeof MediaRecorder === 'undefined'
        ? ''
        : MIME_CANDIDATES.find((mime) => {
            try {
              return MediaRecorder.isTypeSupported(mime);
            } catch {
              return false;
            }
          }) || '';
  }
  return cachedMime;
};

/**
 * True when this device can both record a clip and reach the worker. An insecure page
 * cannot open the mic at all, so `file://` and plain http are excluded here rather than
 * failing later on a permission error.
 */
export const cloudSpeechSupported = (): boolean =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof MediaRecorder !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia);

export type ListenOutcome =
  /** The recogniser returned text. */
  | { kind: 'heard'; transcript: string }
  /** A clip arrived, but there was no speech to recognise in it. */
  | { kind: 'empty' }
  /** The mic could not be opened — permission denied, no device, or an insecure page. */
  | { kind: 'mic-blocked' }
  /** The clip could not be transcribed — offline, or the worker refused it. */
  | { kind: 'network' }
  /** The worker is out of voice allowance: too many answers from this device, or the daily cap. */
  | { kind: 'limited' }
  /** The caller stopped listening before the clip was sent. */
  | { kind: 'cancelled' };

export interface CloudListen {
  /** Settles once the clip has been recorded, uploaded and transcribed. */
  outcome: Promise<ListenOutcome>;
  /** Drops the recording and releases the mic; `outcome` then reports cancelled. */
  cancel: () => void;
}

type Clip = { status: 'ok'; buffer: ArrayBuffer } | { status: 'mic' } | { status: 'empty' };

interface LevelMeter {
  /** Current loudness of the stream, as an RMS amplitude. */
  level: () => number;
  close: () => void;
}

/**
 * Live level meter on the recording stream, for silence detection. Returns null when
 * the browser gives us no AudioContext; the clip then simply runs to its hard cap,
 * which is the behaviour every device had before.
 */
const openMeter = (stream: MediaStream): LevelMeter | null => {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  try {
    const context = new AudioContextCtor();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    // A context created outside a user gesture can start suspended; the mic grant is
    // the gesture here, but resuming is cheap and makes the meter reliable.
    void context.resume().catch(() => undefined);

    return {
      level: () => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
        return Math.sqrt(sum / samples.length);
      },
      close: () => {
        source.disconnect();
        void context.close().catch(() => undefined);
      },
    };
  } catch {
    return null;
  }
};

/**
 * Opens the mic, records until the answer is over or `MAX_CLIP_MS` passes, and hands
 * back the encoded clip. A capture that never rises above room tone is reported as
 * empty without being uploaded — there is nothing to transcribe and no reason to pay.
 */
const recordClip = (signal: AbortSignal): Promise<Clip> =>
  new Promise<Clip>((resolve) => {
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let meter: LevelMeter | null = null;
    let capTimer: number | null = null;
    let vadTimer: number | null = null;
    const chunks: Blob[] = [];
    let settled = false;
    /** False only when the meter is running and has never heard the player. */
    let heardSpeech = false;

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const settle = (value: Clip) => {
      if (settled) return;
      settled = true;
      if (capTimer !== null) window.clearTimeout(capTimer);
      capTimer = null;
      if (vadTimer !== null) window.clearInterval(vadTimer);
      vadTimer = null;
      meter?.close();
      meter = null;
      signal.removeEventListener('abort', onAbort);
      stopTracks();
      resolve(value);
    };

    const stopRecorder = () => {
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          /* already stopping */
        }
      }
    };

    function onAbort() {
      stopRecorder();
      settle({ status: 'empty' });
    }

    signal.addEventListener('abort', onAbort, { once: true });

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        settle({ status: 'mic' });
        return;
      }
      // Aborted while the permission prompt was up — drop the stream we just opened.
      if (settled) {
        stopTracks();
        return;
      }

      const mime = audioMime();
      try {
        recorder = new MediaRecorder(stream, {
          ...(mime ? { mimeType: mime } : {}),
          audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
        });
      } catch {
        settle({ status: 'mic' });
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => settle({ status: 'mic' });
      recorder.onstop = () => {
        // No speech ever crossed the threshold: the upload would buy silence.
        if (!heardSpeech || !chunks.length) {
          settle({ status: 'empty' });
          return;
        }
        const blob = new Blob(chunks, { type: recorder?.mimeType || mime || 'audio/webm' });
        void blob.arrayBuffer().then(
          (buffer) => settle({ status: 'ok', buffer }),
          () => settle({ status: 'empty' }),
        );
      };

      try {
        recorder.start();
      } catch {
        settle({ status: 'mic' });
        return;
      }

      meter = openMeter(stream);
      // Without a meter we cannot tell speech from silence, so the clip is always kept.
      if (!meter) {
        heardSpeech = true;
      } else {
        let quietFor = 0;
        vadTimer = window.setInterval(() => {
          if (meter && meter.level() >= SPEECH_RMS) {
            heardSpeech = true;
            quietFor = 0;
            return;
          }
          // Waiting for the first word is not silence — the player may still be thinking.
          if (!heardSpeech) return;
          quietFor += VAD_POLL_MS;
          if (quietFor >= SILENCE_MS) stopRecorder();
        }, VAD_POLL_MS);
      }

      capTimer = window.setTimeout(stopRecorder, MAX_CLIP_MS);
    })();
  });

/**
 * One voice answer over the network. The clip ends on silence once the player has
 * spoken, and never runs past `MAX_CLIP_MS`, so the audio sent to Whisper — and the
 * number of neurons it costs — tracks the length of the answer rather than a timer.
 *
 * `onRecorded` fires when the mic closes and the upload begins, so the UI can stop
 * saying "listening" while it waits.
 */
export const listenOnce = (onRecorded?: () => void): CloudListen => {
  const controller = new AbortController();
  let cancelled = false;

  const outcome = (async (): Promise<ListenOutcome> => {
    const clip = await recordClip(controller.signal);
    if (cancelled) return { kind: 'cancelled' };
    if (clip.status === 'mic') return { kind: 'mic-blocked' };
    if (clip.status === 'empty') return { kind: 'empty' };

    if (!cancelled) onRecorded?.();

    try {
      const response = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': audioMime() || 'application/octet-stream' },
        body: clip.buffer,
        signal: controller.signal,
      });
      if (response.status === 429 || response.status === 503) return { kind: 'limited' };
      if (!response.ok) return { kind: 'network' };
      const payload = (await response.json()) as { transcript?: unknown };
      const transcript = typeof payload.transcript === 'string' ? payload.transcript.trim() : '';
      return transcript ? { kind: 'heard', transcript } : { kind: 'empty' };
    } catch {
      return cancelled ? { kind: 'cancelled' } : { kind: 'network' };
    }
  })();

  return {
    outcome,
    cancel: () => {
      cancelled = true;
      controller.abort();
    },
  };
};

