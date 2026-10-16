// Server-side speech recognition — the fallback tier.
//
// The Web Speech API answers inside the browser and covers Chrome, Edge and Safari,
// but Firefox and older Android WebViews ship no `SpeechRecognition` at all, and on
// those devices the mic used to be dead. Here the answer is recorded in the page and
// posted to the WordCrew worker, which runs Whisper on Cloudflare's edge.
//
// Only browsers missing the Web Speech API take this route, so the free Workers AI
// allocation normally covers every call: a Chrome or Safari player never sends audio
// anywhere. The clip is capped at a fixed few seconds — one word takes about a second,
// so the window is heard-plus-margin, and the payload stays around 20 kB.

/** Fixed capture window. Long enough for a word, short enough to keep the bill tiny. */
const CLIP_MS = 3200;

/** Opus in WebM first: the smallest payload, and the widest browser support. */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

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
  /** The caller stopped listening before the clip was sent. */
  | { kind: 'cancelled' };

export interface CloudListen {
  /** Settles once the clip has been recorded, uploaded and transcribed. */
  outcome: Promise<ListenOutcome>;
  /** Drops the recording and releases the mic; `outcome` then reports cancelled. */
  cancel: () => void;
}

type Clip = { status: 'ok'; buffer: ArrayBuffer } | { status: 'mic' } | { status: 'empty' };

/** Opens the mic, records for `CLIP_MS`, and hands back the encoded clip. */
const recordClip = (signal: AbortSignal): Promise<Clip> =>
  new Promise<Clip>((resolve) => {
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    const chunks: Blob[] = [];
    let settled = false;

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const settle = (value: Clip) => {
      if (settled) return;
      settled = true;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
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
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      } catch {
        settle({ status: 'mic' });
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => settle({ status: 'mic' });
      recorder.onstop = () => {
        if (!chunks.length) {
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

      timer = window.setTimeout(stopRecorder, CLIP_MS);
    })();
  });

/**
 * One voice answer over the network. A fixed window is used rather than silence
 * detection: it behaves the same on every device and keeps the audio — and therefore
 * the Whisper cost — small and predictable.
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

