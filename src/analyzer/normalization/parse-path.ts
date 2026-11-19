import type { MediaFile } from "../../types.js";

/** Plex-style movie: "Title (Year)" or just "Title". */
const MOVIE_DIR_REGEX = /^(.+?)\s*\((\d{4})\)$/;
/** Episode in filename: S01E01 */
const EPISODE_S_E_REGEX = /S(?<season>\d{1,2})E(?<episode>\d{1,2})/i;
/** Episode in filename: 1x01 */
const EPISODE_X_REGEX = /(?<season>\d{1,2})x(?<episode>\d{1,2})/i;

type FileRole = "video" | "subtitle" | "nfo" | "other";

export interface MovieRef {
  movieKey: string;
  title: string;
  year?: number;
  role: FileRole;
}

export interface EpisodeRef {
  seriesKey: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeKey: string;
  role: FileRole;
}

function basenameNoExt(file: MediaFile): string {
  const segments = file.relativePath.replace(/\\/g, "/").split("/");
  const name = segments[segments.length - 1] ?? "";
  const lastDot = name.lastIndexOf(".");
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

function getRole(file: MediaFile): FileRole {
  switch (file.kind) {
    case "video":
    case "subtitle":
    case "nfo":
      return file.kind;
    case "audio":
    case "image":
    case "other":
      return "other";
  }
}

function movieYear(...matches: (RegExpExecArray | null)[]): number | undefined {
  const text = matches.map((m) => m?.[2]).find(Boolean);
  return text ? parseInt(text, 10) : undefined;
}

/** Normalizes a "Title (Year)" match into its key form. */
function movieKeyFromMatch(match: RegExpExecArray | null): string | null {
  return match ? `${match[1]?.trim() ?? ""} (${match[2] ?? ""})` : null;
}

export function parseMovieFile(file: MediaFile): MovieRef | null {
  const base = basenameNoExt(file);
  const lastFolder = file.folderSegments[file.folderSegments.length - 1];
  const dirMatch = lastFolder === undefined ? null : MOVIE_DIR_REGEX.exec(lastFolder);
  const fileMatch = MOVIE_DIR_REGEX.exec(base);

  if (file.kind === "video" && !dirMatch && !fileMatch) return null;

  return {
    movieKey: movieKeyFromMatch(dirMatch) ?? movieKeyFromMatch(fileMatch) ?? (base || "unknown"),
    title: (fileMatch ?? dirMatch)?.[1]?.trim() ?? base,
    year: movieYear(fileMatch, dirMatch),
    role: getRole(file),
  };
}

export function parseEpisodeFile(file: MediaFile): EpisodeRef | null {
  const base = basenameNoExt(file);
  const epMatch = EPISODE_S_E_REGEX.exec(base) ?? EPISODE_X_REGEX.exec(base);
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
