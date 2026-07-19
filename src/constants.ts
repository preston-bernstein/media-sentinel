/** Exit code: no issues found. */
export const EXIT_OK = 0;

/** Exit code: issues found (e.g. orphaned files, duplicates). */
export const EXIT_ISSUES_FOUND = 1;

/** Exit code: runtime error (e.g. config load failure). */
export const EXIT_RUNTIME_ERROR = 3;

/** Default max concurrent fs operations when not set in config. */
export const DEFAULT_CONCURRENCY = 16;
