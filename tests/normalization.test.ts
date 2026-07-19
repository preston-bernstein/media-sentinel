import { describe, it, expect } from "vitest";
import { parseMovieFile, parseEpisodeFile } from "../src/analyzer/normalization/parse-path.js";
import { buildLogicalIndex } from "../src/analyzer/normalization/build-index.js";
import type { MediaFile, ScanResult, Config } from "../src/types.js";

function file(
  overrides: Partial<MediaFile> & { rootName: string; relativePath: string }
): MediaFile {
  return {
    id: "1",
    rootName: overrides.rootName,
    relativePath: overrides.relativePath,
    absolutePath: "/" + overrides.relativePath,
    sizeBytes: 0,
    mtimeMs: 0,
    extension: "mkv",
    kind: "video",
    folderSegments: overrides.relativePath.replace(/\\/g, "/").split("/").slice(0, -1),
    ...overrides,
  };
}

const rootMovies = { name: "movies", path: "/m", kind: "movies" as const };
const rootTv = { name: "tv", path: "/t", kind: "tv" as const };
const rootOther = { name: "other", path: "/o", kind: "other" as const };

describe("parseMovieFile", () => {
  it("parses from folder name Title (Year)", () => {
    const f = file({
      rootName: "movies",
      relativePath: "Inception (2010)/Inception (2010).mkv",
      kind: "video",
    });
    const ref = parseMovieFile(f, rootMovies);
    expect(ref?.movieKey).toBe("Inception (2010)");
    expect(ref?.year).toBe(2010);
  });

  it("parses from filename when no folder match", () => {
    const f = file({
      rootName: "movies",
      relativePath: "Inception (2010).mkv",
      folderSegments: [],
      kind: "video",
    });
    const ref = parseMovieFile(f, rootMovies);
    expect(ref?.movieKey).toBe("Inception (2010)");
  });

  it("returns nfo role for nfo file", () => {
    const f = file({
      rootName: "movies",
      relativePath: "Inception (2010)/Inception (2010).nfo",
      kind: "nfo",
    });
    const ref = parseMovieFile(f, rootMovies);
    expect(ref?.role).toBe("nfo");
  });

  it("returns other role for image", () => {
    const f = file({
      rootName: "movies",
      relativePath: "Inception (2010)/poster.jpg",
      extension: "jpg",
      kind: "image",
    });
    const ref = parseMovieFile(f, rootMovies);
    expect(ref?.role).toBe("other");
  });
});

describe("parseEpisodeFile", () => {
  it("parses S01E01", () => {
    const f = file({
      rootName: "tv",
      relativePath: "Show/Season 01/Show - S01E01.mkv",
      kind: "video",
    });
    const ref = parseEpisodeFile(f, rootTv);
    expect(ref?.episodeKey).toBe("Show-S01E01");
    expect(ref?.seasonNumber).toBe(1);
    expect(ref?.episodeNumber).toBe(1);
  });

  it("returns null when no episode pattern", () => {
    const f = file({
      rootName: "tv",
      relativePath: "Show/random.mkv",
      kind: "video",
    });
    expect(parseEpisodeFile(f, rootTv)).toBeNull();
  });

  it("returns null for S00E00", () => {
    const f = file({
      rootName: "tv",
      relativePath: "Show/S00E00.mkv",
      kind: "video",
    });
    expect(parseEpisodeFile(f, rootTv)).toBeNull();
  });

  it("uses Unknown when folderSegments empty", () => {
    const f = file({
      rootName: "tv",
      relativePath: "Show.S01E01.mkv",
      folderSegments: [],
      kind: "video",
    });
    const ref = parseEpisodeFile(f, rootTv);
    expect(ref?.seriesTitle).toBe("Unknown");
  });
});

describe("buildLogicalIndex", () => {
  it("puts video in unclassifiedVideos for other root", () => {
    const scan: ScanResult = {
      kind: "scan",
      version: 1,
      config: { roots: [rootOther] },
      roots: [rootOther],
      files: [
        file({ rootName: "other", relativePath: "x.mkv", kind: "video" }),
      ],
      stats: { numFiles: 1, numDirs: 0, totalBytes: 0, startedAt: "", finishedAt: "", durationMs: 0 },
    };
    const index = buildLogicalIndex(scan, scan.config);
    expect(index.unclassifiedVideos.length).toBe(1);
  });

  it("puts subtitle in unclassifiedSubtitles for other root", () => {
    const scan: ScanResult = {
      kind: "scan",
      version: 1,
      config: { roots: [rootOther] },
      roots: [rootOther],
      files: [
        file({ rootName: "other", relativePath: "x.srt", kind: "subtitle", extension: "srt" }),
      ],
      stats: { numFiles: 1, numDirs: 0, totalBytes: 0, startedAt: "", finishedAt: "", durationMs: 0 },
    };
    const index = buildLogicalIndex(scan, scan.config);
    expect(index.unclassifiedSubtitles.length).toBe(1);
  });

  it("assigns nfo and other to episode item", () => {
    const scan: ScanResult = {
      kind: "scan",
      version: 1,
      config: { roots: [rootTv] },
      roots: [rootTv],
      files: [
        file({
          rootName: "tv",
          relativePath: "Show/Season 01/Show - S01E01.mkv",
          kind: "video",
        }),
        file({
          rootName: "tv",
          relativePath: "Show/Season 01/Show - S01E01.nfo",
          kind: "nfo",
          extension: "nfo",
        }),
        file({
          rootName: "tv",
          relativePath: "Show/Season 01/Show - S01E01-thumb.jpg",
          kind: "image",
          extension: "jpg",
        }),
      ],
      stats: { numFiles: 3, numDirs: 0, totalBytes: 0, startedAt: "", finishedAt: "", durationMs: 0 },
    };
    const index = buildLogicalIndex(scan, scan.config);
    const ep = index.episodesByKey.get("Show-S01E01");
    expect(ep?.nfoFiles.length).toBe(1);
    expect(ep?.otherFiles.length).toBe(1);
  });

  it("assigns nfo and other to movie item", () => {
    const scan: ScanResult = {
      kind: "scan",
      version: 1,
      config: { roots: [rootMovies] },
      roots: [rootMovies],
      files: [
        file({
          rootName: "movies",
          relativePath: "Inception (2010)/Inception (2010).mkv",
          kind: "video",
        }),
        file({
          rootName: "movies",
          relativePath: "Inception (2010)/Inception (2010).nfo",
          kind: "nfo",
          extension: "nfo",
        }),
        file({
          rootName: "movies",
          relativePath: "Inception (2010)/poster.jpg",
          kind: "image",
          extension: "jpg",
        }),
      ],
      stats: { numFiles: 3, numDirs: 0, totalBytes: 0, startedAt: "", finishedAt: "", durationMs: 0 },
    };
    const index = buildLogicalIndex(scan, scan.config);
    const movie = index.moviesByKey.get("Inception (2010)");
    expect(movie?.nfoFiles.length).toBe(1);
    expect(movie?.otherFiles.length).toBe(1);
  });
});
