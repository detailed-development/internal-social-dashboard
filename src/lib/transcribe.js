import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import axios from 'axios';

// Common English stop words filtered out of buzzword extraction
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','up','about','into','through','during','is','are','was','were','be',
  'been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','can','i','you','he','she','it','we','they','me',
  'him','her','us','them','my','your','his','its','our','their','this','that',
  'these','those','what','which','who','when','where','how','all','each','both',
  'few','more','most','other','some','such','no','not','only','same','so','than',
  'too','very','just','now','like','also','really','even','much','many',
  'get','got','go','going','know','think','want','make','see','look','come',
  'back','time','year','way','day','thing','good','new','old','first','last',
  'long','great','little','own','right','big','high','different','small','large',
  'next','early','young','important','public','private','real','best','free',
  'out','down','over','between','then','there','here','one','two','three',
  'yeah','okay','oh','um','uh','like','well','actually','basically',
]);

function extractBuzzwords(text, max = 20) {
  const freq = {};
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  for (const w of words) {
    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word, frequency]) => ({ word, frequency }));
}

async function saveTranscription(prisma, postId, text, language, durationSeconds) {
  // Guard: don't double-transcribe
  const existing = await prisma.transcription.findUnique({
    where: { postId },
    select: { id: true },
  });
  if (existing) return existing;

  const record = await prisma.transcription.create({
    data: { postId, transcriptText: text, language, durationSeconds },
  });

  const words = extractBuzzwords(text);
  if (words.length > 0) {
    await prisma.buzzword.createMany({
      data: words.map(w => ({
        transcriptionId: record.id,
        word: w.word,
        frequency: w.frequency,
      })),
    });
  }

  return record;
}

/**
 * Transcribe an Instagram Reel using OpenAI Whisper.
 * Streams the video from the Meta CDN URL directly to the Whisper API.
 * Requires OPENAI_API_KEY in env.
 */
export async function transcribeReel(prisma, post) {
  if (!process.env.OPENAI_API_KEY) return;
  if (!post.mediaUrl) return;

  const existing = await prisma.transcription.findUnique({
    where: { postId: post.id },
    select: { id: true },
  });
  if (existing) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Stream video from CDN → Whisper (avoids loading full file into memory)
  const videoRes = await axios.get(post.mediaUrl, {
    responseType: 'stream',
    timeout: 90_000,
  });

  const file = await toFile(videoRes.data, 'reel.mp4', { type: 'video/mp4' });
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
  });

  if (!result.text?.trim()) return;

  await saveTranscription(
    prisma,
    post.id,
    result.text.trim(),
    result.language ?? 'en',
    result.duration ? Math.round(result.duration) : null,
  );
}

/**
 * Fetch auto-generated captions for a YouTube video via the unofficial
 * timedtext API. Falls back silently if captions are unavailable.
 * No API key or auth required for public videos.
 */
export async function transcribeYouTubeVideo(prisma, post) {
  const existing = await prisma.transcription.findUnique({
    where: { postId: post.id },
    select: { id: true },
  });
  if (existing) return;

  const videoId = post.platformPostId;
  let text = '';

  // Try standard 'en' caption track first, then the auto-generated 'asr' track
  for (const params of [
    { v: videoId, lang: 'en', fmt: 'json3' },
    { v: videoId, lang: 'en', kind: 'asr', fmt: 'json3' },
  ]) {
    try {
      const res = await axios.get('https://www.youtube.com/api/timedtext', {
        params,
        timeout: 15_000,
      });
      const events = res.data?.events ?? [];
      const candidate = events
        .filter(e => e.segs)
        .flatMap(e => e.segs.map(s => s.utf8 ?? ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (candidate.length > 20) {
        text = candidate;
        break;
      }
    } catch (_) {}
  }

  if (!text) return;

  await saveTranscription(prisma, post.id, text, 'en', null);
}
