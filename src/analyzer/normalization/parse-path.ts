import type { MediaFile, MediaRootConfig } from "../../types.js";

/** Plex-style movie: "Title (Year)" or just "Title". */
const MOVIE_DIR_REGEX = /^(.+?)\s*\((\d{4})\)$/;
/** Episode in filename: S01E01 */
const EPISODE_S_E_REGEX = /S(?<season>\d{1,2})E(?<episode>\d{1,2})/i;
/** Episode in filename: 1x01 */
const EPISODE_X_REGEX = /(?<season>\d{1,2})x(?<episode>\d{1,2})/i;

export interface MovieRef {
  movieKey: string;
  title: string;
  year?: number;
  role: "video" | "subtitle" | "nfo" | "other";
}

export interface EpisodeRef {
  seriesKey: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeKey: string;
  role: "video" | "subtitle" | "nfo" | "other";
}

function basenameNoExt(file: MediaFile): string {
  const segments = file.relativePath.replace(/\\/g, "/").split("/");
  const name = segments[segments.length - 1] ?? "";
  const lastDot = name.lastIndexOf(".");
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

function getRole(file: MediaFile): MovieRef["role"] | EpisodeRef["role"] {
  switch (file.kind) {
    case "video":
      return "video";
    case "subtitle":
      return "subtitle";
    case "nfo":
      return "nfo";
    default:
      return "other";
  }
}

export function parseMovieFile(
  file: MediaFile,
  _root: MediaRootConfig
): MovieRef | null {
  const base = basenameNoExt(file);
  const dirMatch = file.folderSegments.length > 0
    ? file.folderSegments[file.folderSegments.length - 1]?.match(MOVIE_DIR_REGEX)
    : null;
  const folderKey = dirMatch ? `${dirMatch[1].trim()} (${dirMatch[2]})` : null;
  const fileMatch = base.match(MOVIE_DIR_REGEX);
  const fileKey = fileMatch ? `${fileMatch[1].trim()} (${fileMatch[2]})` : null;

  if (file.kind === "video" && !dirMatch && !fileMatch) return null;

  const movieKey = folderKey ?? fileKey ?? (base || "unknown");
  const title = fileMatch?.[1]?.trim() ?? dirMatch?.[1]?.trim() ?? base;
  const year = fileMatch?.[2] ? parseInt(fileMatch[2], 10) : dirMatch?.[2] ? parseInt(dirMatch[2], 10) : undefined;

  return {
    movieKey,
    title,
    year,
    role: getRole(file),
  };
}

export function parseEpisodeFile(
  file: MediaFile,
  _root: MediaRootConfig
): EpisodeRef | null {
  const base = basenameNoExt(file);
  const epMatch = base.match(EPISODE_S_E_REGEX) ?? base.match(EPISODE_X_REGEX);
  if (!epMatch?.groups) return null;

  const season = parseInt(epMatch.groups.season ?? "0", 10);
  const episode = parseInt(epMatch.groups.episode ?? "0", 10);
  if (season === 0 && episode === 0) return null;

  const seriesTitle =
    file.folderSegments.length > 0 ? (file.folderSegments[0] ?? "Unknown") : "Unknown";
  const seriesKey = seriesTitle.replace(/\s+/g, " ").trim();
  const episodeKey = `${seriesKey}-S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;

  return {
    seriesKey,
    seriesTitle,
    seasonNumber: season,
    episodeNumber: episode,
    episodeKey,
    role: getRole(file),
  };
}
