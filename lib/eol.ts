import { EOL } from 'node:os';
import { resolve } from 'node:path';
import editorconfig from 'editorconfig';
import type { Cache as EditorConfigCache } from 'editorconfig';

type EndOfLine = '\n' | '\r\n';

export type EndOfLineResolver = {
  /** EditorConfig `end_of_line` for the file path, if set. */
  getExplicitEndOfLine: (filePath: string) => Promise<EndOfLine | undefined>;
  /**
   * Write-time precedence: EditorConfig → detect(contents) → `os.EOL`.
   * New/empty docs pass `contents` as undefined (skip detection).
   */
  resolve: (
    filePath: string,
    contents: string | undefined,
  ) => Promise<EndOfLine>;
};

/**
 * Create a memoized end-of-line resolver scoped to one `generate()` run.
 * Cache keys are absolute file paths so sibling `.md`/`.mdx` files can differ.
 *
 * Write-time precedence for `resolve()`:
 * 1. Explicit EditorConfig `end_of_line`
 * 2. Predominant end of line in existing contents (skip when `contents` is undefined)
 * 3. `os.EOL`
 *
 * Prettier config is not read — run Prettier via `postprocess` if needed.
 */
export function createEndOfLineResolver(): EndOfLineResolver {
  const explicitCache = new Map<string, Promise<EndOfLine | undefined>>();
  /** Shared across files so EditorConfig does not re-read the same files. */
  const editorConfigFileCache: EditorConfigCache = new Map();

  async function getExplicitEndOfLine(
    filePath: string,
  ): Promise<EndOfLine | undefined> {
    const absolutePath = resolve(filePath);
    let cached = explicitCache.get(absolutePath);
    if (!cached) {
      cached = getEndOfLineFromEditorConfig(
        absolutePath,
        editorConfigFileCache,
      );
      explicitCache.set(absolutePath, cached);
    }
    const result = await cached;
    return result;
  }

  async function resolveFileEndOfLine(
    filePath: string,
    contents: string | undefined,
  ): Promise<EndOfLine> {
    return (
      (await getExplicitEndOfLine(filePath)) ??
      (contents === undefined ? undefined : detectEndOfLine(contents)) ??
      getFallbackEndOfLine()
    );
  }

  return {
    getExplicitEndOfLine,
    resolve: resolveFileEndOfLine,
  };
}

async function getEndOfLineFromEditorConfig(
  filePath: string,
  cache: EditorConfigCache,
): Promise<EndOfLine | undefined> {
  const editorConfigProps = await editorconfig.parse(filePath, { cache });

  if (editorConfigProps.end_of_line === 'lf') {
    return '\n';
  }

  if (editorConfigProps.end_of_line === 'crlf') {
    return '\r\n';
  }

  return undefined;
}

/**
 * Detect the predominant end of line in the given file contents.
 * Returns undefined if the contents have no line breaks.
 */
export function detectEndOfLine(contents: string): EndOfLine | undefined {
  const crlfCount = contents.split('\r\n').length - 1;
  // All LFs minus those that are part of a CRLF.
  const lfCount = contents.split('\n').length - 1 - crlfCount;

  if (crlfCount === 0 && lfCount === 0) {
    return undefined;
  }

  // A tie favors LF.
  return crlfCount > lfCount ? '\r\n' : '\n';
}

/**
 * Convert all line endings in the given contents to the given end of line.
 */
export function normalizeEndOfLine(
  contents: string,
  endOfLine: string,
): string {
  return contents.replaceAll(/\r\n|[\r\n]/gu, endOfLine);
}

/** Fallback when there is no config and no detectable end of line. */
export function getFallbackEndOfLine(): EndOfLine {
  return getNodeEOL();
}

/* istanbul ignore next */
/** `EOL` is typed as `string`, so we perform run-time validation to be safe. */
function getNodeEOL(): EndOfLine {
  if (EOL === '\n' || EOL === '\r\n') {
    return EOL;
  }

  throw new Error(
    `Failed to detect the end-of-line constant from the JavaScript runtime: ${EOL}`,
  );
}
