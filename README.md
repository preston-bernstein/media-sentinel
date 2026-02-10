# Media Sentinel

[![CI](https://github.com/prestonbernstein/media-sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/prestonbernstein/media-sentinel/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Coverage](https://img.shields.io/badge/coverage-100%25%20lines%20%7C%2094%25%20branches-brightgreen)](./vitest.config.ts)

CLI-first media library integrity checker for **Synology NAS** (DS1522+), aimed at Plex-style layouts: **Movies**, **TV Shows**, **Music** under a single media root.

- **Scan** → **Analyze** → **Report** (no file or folder changes; apply phase is planned later).
- Phased, stackable CLI: run only the phases you need, pass artifacts between runs via `--input` / `--output`.
- Suited for scheduled runs (cron / Synology Task Scheduler) and automation.

### Status

| Item | Status |
|------|--------|
| **Node** | 20+ (LTS) |
| **Phases** | scan, analyze, report ✅ · apply (planned) |
| **Tests** | Vitest, 100% lines/functions, 94% branches |
| **CI** | GitHub Actions (build + test + coverage) |

## What it does

1. **Scan** – Walks configured roots, collects file metadata (path, size, type: video/subtitle/nfo/etc.).
2. **Analyze** – Builds a Plex-oriented logical model (movies, episodes) and runs integrity rules:
   - **Orphaned files** – Videos or subtitles not in a recognized movie/episode structure.
   - **Missing companions** – Video with no subtitle, or subtitle with no video.
   - **Duplicate files** – Multiple video files for the same movie or episode.
   - **Suspicious structure** – Episode not under a `Season XX` folder.
3. **Report** – Writes a human-readable Markdown report or JSON (for scripting).

Only **reads** the filesystem during scan and **writes** the report/artifact files you specify. No moves, renames, or deletes.

## Performance

- **Scan phase**: File stats run with a **concurrency limit** (default 16, configurable via `--concurrency` or `config.concurrency`) so the NAS isn’t hammered with thousands of simultaneous stat calls. Higher values can speed up local or fast storage; lower values help on high-latency or slow NAS.
- **Walk**: Uses `readdir(..., { withFileTypes: true })` so we don’t stat just to see if an entry is a file or directory. Exclude checks short-circuit when there are no patterns.
- **Analyze / report**: In-memory only; no extra I/O.

## Requirements

- **Node.js 20+**
- Runs on the NAS (Node package, Docker, or Synology’s Node) or on a machine with access to the media paths.

## Install

```bash
git clone <repo>
cd media-sentinel
npm install
npm run build
```

Global run:

```bash
npm link
media-sentinel --help
```

Or run locally:

```bash
node dist/index.js --help
```

## Configuration

Copy `config.example.yaml` and point at your media roots. Example for `/volume1/Media`:

```yaml
roots:
  - name: movies
    path: /volume1/Media/Movies
    kind: movies
    namingStyle: plex-movies
  - name: tv
    path: /volume1/Media/TV Shows
    kind: tv
    namingStyle: plex-tv
  - name: music
    path: /volume1/Media/Music
    kind: music
```

Optional: `globalExcludes`, `concurrency`, `maxDepth`, per-rule `rules` toggles and severity overrides.

## CLI

| Option | Description |
|--------|-------------|
| `--root <path...>` | Media root folder(s) (repeatable). |
| `--config <file>` | Config file (JSON or YAML). |
| `--exclude <glob...>` | Extra exclude patterns. |
| `--scan` | Run scan phase. |
| `--analyze` | Run analyze phase. |
| `--report` | Run report phase. |
| `--apply` | Reserved (not implemented). |
| `--input <file>` | Input artifact (scan or analysis JSON). |
| `--output <file>` | Output artifact or report file. |
| `--json` | Emit JSON for the last phase. |
| `--dry-run` | Do not write files. |
| `--verbose` | Verbose logs to stderr. |
| `--quiet` | Only warnings/errors. |
| `--concurrency <n>` | Max concurrent fs operations. |
| `--max-depth <n>` | Max directory depth. |

If no phase flags are given, defaults to **scan → analyze → report**.

### Exit codes

- **0** – Success, no issues.
- **1** – Success, but issues found.
- **2** – Config/CLI error.
- **3** – Runtime error.

## Examples

Full run with config, JSON report to file (e.g. for Synology Task Scheduler):

```bash
media-sentinel \
  --config /volume1/config/media-sentinel.yaml \
  --scan --analyze --report \
  --output /volume1/logs/media-sentinel/report.md
```

Scan only, save artifact for later:

```bash
media-sentinel --config config.yaml --scan --output scan.json
```

Analyze and report from a previous scan:

```bash
media-sentinel --input scan.json --analyze --report --output report.md
```

JSON report to stdout (dry-run):

```bash
media-sentinel --config config.yaml --scan --analyze --report --json --dry-run
```

## Project layout

- `src/index.ts` – CLI (Commander), calls `runPipeline`, exit codes.
- `src/run-pipeline.ts` – Orchestrates phases, serialization, config load.
- `src/config.ts` – Load/merge config (YAML/JSON).
- `src/scanner/` – Directory walk, `MediaFile` collection.
- `src/analyzer/` – Normalization (Plex movies/TV), logical index, rules.
- `src/reporter/` – Markdown and JSON reports.
- `src/serialization.ts` – Read/write scan and analysis artifacts.
- `src/types.ts` – Shared types.
- `tests/` – Vitest tests and fixture libraries.

## Tests

```bash
npm test
npm run test:coverage   # with coverage report
```

Coverage is enforced: **100%** lines, statements, and functions; **94%** branches (see `vitest.config.ts`). The CLI entry (`src/index.ts`) is excluded from coverage and is exercised via unit tests for `runCli`, `main`, and `runEntryPoint`.

### Badge URLs

If you fork this repo, update the CI badge in this README to your repo:

- Replace `prestonbernstein/media-sentinel` in the badge and link URLs with `your-username/your-repo`.

## License

MIT
