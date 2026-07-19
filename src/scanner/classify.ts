import type { MediaFile } from "../types.js";

const VIDEO_EXT = new Set(["mkv", "mp4", "avi", "mov", "wmv", "m4v", "webm"]);
const AUDIO_EXT = new Set(["mp3", "flac", "aac", "ogg", "m4a", "wav", "wma"]);
const SUBTITLE_EXT = new Set(["srt", "ass", "ssa", "vtt"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const NFO_EXT = new Set(["nfo"]);

export function classifyExtension(ext: string): MediaFile["kind"] {
  const lower = ext.toLowerCase();
  if (VIDEO_EXT.has(lower)) return "video";
  if (AUDIO_EXT.has(lower)) return "audio";
  if (SUBTITLE_EXT.has(lower)) return "subtitle";
  if (IMAGE_EXT.has(lower)) return "image";
  if (NFO_EXT.has(lower)) return "nfo";
  return "other";
}
