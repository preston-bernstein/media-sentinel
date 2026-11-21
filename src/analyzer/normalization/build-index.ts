import type {
  Config,
  MediaFile,
  ScanResult,
  LogicalIndex,
  MovieItem,
  EpisodeItem,
} from "../../types.js";
import { parseMovieFile, parseEpisodeFile, type MovieRef, type EpisodeRef } from "./parse-path.js";

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

function emptyFiles(): MediaItemWithFiles {
  return { videoFiles: [], subtitleFiles: [], nfoFiles: [], otherFiles: [] };
}

function newMovieItem(ref: MovieRef, file: MediaFile): MovieItem {
  return {
    key: ref.movieKey,
    title: ref.title,
    year: ref.year,
    rootName: file.rootName,
    relativeDir: file.folderSegments.join("/"),
    ...emptyFiles(),
  };
}

function newEpisodeItem(ref: EpisodeRef, file: MediaFile): EpisodeItem {
  return {
    key: ref.episodeKey,
    seriesTitle: ref.seriesTitle,
    seriesKey: ref.seriesKey,
    seasonNumber: ref.seasonNumber,
    episodeNumber: ref.episodeNumber,
    rootName: file.rootName,
    relativeDir: file.folderSegments.join("/"),
    ...emptyFiles(),
  };
}

function getOrCreate<T>(groups: Map<string, T>, key: string, create: () => T): T {
  let item = groups.get(key);
  if (!item) {
    item = create();
    groups.set(key, item);
  }
  return item;
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

  const addUnclassified = (file: MediaFile): void => {
    if (file.kind === "video") unclassifiedVideos.push(file);
    if (file.kind === "subtitle") unclassifiedSubtitles.push(file);
  };

  for (const file of scan.files) {
    const root = rootByName.get(file.rootName);
    const kind = root?.kind ?? "other";

    if (root && kind === "movies") {
      const ref = parseMovieFile(file);
      if (ref) {
        pushFileByRole(getOrCreate(moviesByKey, ref.movieKey, () => newMovieItem(ref, file)), file, ref.role);
      } else {
        addUnclassified(file);
      }
    } else if (root && kind === "tv") {
      const ref = parseEpisodeFile(file);
      if (ref) {
        pushFileByRole(getOrCreate(episodesByKey, ref.episodeKey, () => newEpisodeItem(ref, file)), file, ref.role);
      } else {
        addUnclassified(file);
      }
    } else {
      addUnclassified(file);
    }
  }

  return {
    moviesByKey,
    episodesByKey,
    unclassifiedVideos,
    unclassifiedSubtitles,
  };
}
