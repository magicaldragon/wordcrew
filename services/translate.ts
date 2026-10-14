// Client-side Vietnamese translation used for in-game hints.
//
// Ported from the WiseSpeak pattern: hit Google's public "gtx" endpoint first
// (fast, generous limits), then fall back to MyMemory (reliable CORS). Both are
// key-less and work from the browser and the packaged WebView alike, which is
// why this is preferred over the on-device Translator API (Chrome-desktop only).

export async function translateText(text: string, from = 'en', to = 'vi'): Promise<string | null> {
  const query = text.trim();
  if (!query) return null;

  // 1. Google Translate internal API (client=gtx) — same one browser extensions use.
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      // Shape: [[["Translated", "Original", null, null, 1], ...], ...]
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map((item: any) => item[0]).join('');
      }
    }
  } catch (error) {
    console.warn('Google Translate endpoint failed, falling back to MyMemory…', error);
  }

  // 2. MyMemory fallback.
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${from}|${to}`
    );
    const data = await response.json();
    if (data?.responseStatus === 200) {
      return data.responseData?.translatedText ?? null;
    }
    console.error('Translation API error:', data?.responseDetails);
    return null;
  } catch (error) {
    console.error('Translation fetch error:', error);
    return null;
  }
}
