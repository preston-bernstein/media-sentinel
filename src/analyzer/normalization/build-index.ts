import type {
  Config,
  MediaFile,
  ScanResult,
  LogicalIndex,
  MovieItem,
  EpisodeItem,
} from "../../types.js";
import { parseMovieFile, parseEpisodeFile } from "./parse-path.js";

/** Item shape that has file arrays by role (movie and episode both use this). */
interface MediaItemWithFiles {
  videoFiles: MediaFile[];
  subtitleFiles: MediaFile[];
  nfoFiles: MediaFile[];
  otherFiles: MediaFile[];
}

function pushFileByRole(
  item: MediaItemWithFiles,
  file: MediaFile,
  role: string
): void {
  switch (role) {
    case "video":
      item.videoFiles.push(file);
      break;
    case "subtitle":
      item.subtitleFiles.push(file);
      break;
    case "nfo":
      item.nfoFiles.push(file);
      break;
    default:
      item.otherFiles.push(file);
  }
}

/**
 * Builds a Plex-oriented logical index from a raw scan: groups files into
 * movies and episodes by root kind and naming, and collects unclassified
 * videos/subtitles for orphan rules.
 */
export function buildLogicalIndex(scan: ScanResult, config: Config): LogicalIndex {
  const moviesByKey = new Map<string, MovieItem>();
  const episodesByKey = new Map<string, EpisodeItem>();
  const unclassifiedVideos: MediaFile[] = [];
  const unclassifiedSubtitles: MediaFile[] = [];

  const rootByName = new Map(config.roots.map((r) => [r.name, r]));

  for (const file of scan.files) {
    const root = rootByName.get(file.rootName);
    const kind = root?.kind ?? "other";

    if (kind === "movies") {
      const ref = parseMovieFile(file, root!);
      if (!ref) {
        if (file.kind === "video") unclassifiedVideos.push(file);
        if (file.kind === "subtitle") unclassifiedSubtitles.push(file);
        continue;
      }
      let item = moviesByKey.get(ref.movieKey);
      if (!item) {
        const relativeDir = file.folderSegments.join("/");
        item = {
          key: ref.movieKey,
          title: ref.title,
          year: ref.year,
          rootName: file.rootName,
          relativeDir,
          videoFiles: [],
          subtitleFiles: [],
          nfoFiles: [],
          otherFiles: [],
        };
        moviesByKey.set(ref.movieKey, item);
      }
      pushFileByRole(item, file, ref.role);
      continue;
    }

    if (kind === "tv") {
      const ref = parseEpisodeFile(file, root!);
      if (!ref) {
        if (file.kind === "video") unclassifiedVideos.push(file);
        if (file.kind === "subtitle") unclassifiedSubtitles.push(file);
        continue;
      }
      let item = episodesByKey.get(ref.episodeKey);
      if (!item) {
        const relativeDir = file.folderSegments.join("/");
        item = {
          key: ref.episodeKey,
          seriesTitle: ref.seriesTitle,
          seriesKey: ref.seriesKey,
          seasonNumber: ref.seasonNumber,
          episodeNumber: ref.episodeNumber,
          rootName: file.rootName,
          relativeDir,
          videoFiles: [],
          subtitleFiles: [],
          nfoFiles: [],
          otherFiles: [],
        };
        episodesByKey.set(ref.episodeKey, item);
      }
      pushFileByRole(item, file, ref.role);
      continue;
    }

    if (file.kind === "video") unclassifiedVideos.push(file);
    if (file.kind === "subtitle") unclassifiedSubtitles.push(file);
  }

  return {
    moviesByKey,
    episodesByKey,
    unclassifiedVideos,
    unclassifiedSubtitles,
  };
}
