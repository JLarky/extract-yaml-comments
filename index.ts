/**
 * Extract comments from a YAML file and attach them to nearest following node path.
 *
 * Provides utilities to parse a YAML document and produce structured comment metadata.
 * Skips comments found inside block scalar sections.
 *
 * @example
 * ```typescript
 * import { extractYamlComments } from "@jlarky/extract-yaml-comments";
 * const { comments } = extractYamlComments("a: 1\n# greeting\nb: 2");
 * console.log(comments[0]); // { line: 2, path: "b", text: "greeting" }
 * ```
 *
 * @module
 */

import YAML from "yaml";

const { isMap, isSeq, isScalar } = YAML;

/**
 * Represents a comment extracted from a YAML document.
 */
export interface YamlComment {
  /** The line number where the comment appears (1-indexed) */
  line: number;

  /** The path to the nearest following YAML node (dot-separated path) */
  path: string;

  /** The comment text (without the '#' prefix and leading space) */
  text: string;
}

/**
 * Result of extracting comments from a YAML document.
 */
export interface ExtractYamlCommentsResult {
  /** Array of extracted comments */
  comments: YamlComment[];
}

/**
 * Extract comments from a YAML document.
 *
 * This function parses a YAML string and extracts all comments, mapping each comment
 * to the nearest following YAML node. Comments inside block scalars are excluded.
 *
 * @param src - The YAML document source code as a string
 * @returns An object containing an array of extracted comments
 *
 * @example
 * ```typescript
 * const result = extractYamlComments(`
 *   # This is a config
 *   name: John
 *   # Age in years
 *   age: 30
 * `);
 * console.log(result.comments);
 * // [
 * //   { line: 2, path: "document", text: "This is a config" },
 * //   { line: 4, path: "age", text: "Age in years" }
 * // ]
 * ```
 */
export function extractYamlComments(src: string): ExtractYamlCommentsResult {
  const doc = YAML.parseDocument(src);

  // Build AST node starts and collect block scalar ranges to exclude inline '#'
  interface AstNode {
    start?: number;
    path: string;
  }

  const ast: AstNode[] = [];
  const blockRanges: Array<[number, number]> = [];

  const keyStr = (k: unknown): string =>
    isScalar(k) ? String((k as any).value) : "<non-scalar-key>";

  const walkAst = (node: any, path: (string | number)[]): void => {
    if (!node) return;

    ast.push({
      start: node.range?.[0],
      path: path.join("."),
    });

    if (node.type === "BLOCK_LITERAL" && node.range) {
      blockRanges.push([node.range[0], node.range[1]]);
    }

    if (isMap(node)) {
      for (const pair of node.items || []) {
        const key = keyStr(pair.key);
        walkAst(pair.value, [...path, key]);
      }
    } else if (isSeq(node)) {
      (node.items || []).forEach((child: any, i: number) =>
        walkAst(child, [...path, i]),
      );
    }
  };

  walkAst(doc.contents, []);

  const firstAstStart = ast.reduce(
    (m: number | undefined, n: AstNode) =>
      n.start != null && (m == null || n.start < m) ? n.start : m,
    undefined,
  );

  const inBlock = (offset: number): boolean =>
    blockRanges.some(
      ([s, e]) => s != null && e != null && offset >= s && offset < e,
    );

  const nearestFollowingPath = (offset: number): string => {
    let best: AstNode | undefined;
    for (const n of ast) {
      if (n.start == null) continue;
      if (n.start >= offset && (!best || n.start < best.start!)) best = n;
    }
    return best ? best.path : "document";
  };

  // Precompute start offsets of each line
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "\n") lineStarts.push(i + 1);
  }
  const lines = src.split("\n");

  const comments: YamlComment[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const hashIdx = line.indexOf("#");
    if (hashIdx === -1) continue;

    // treat only YAML comment lines (first non-space is '#')
    const trimmed = line.trimStart();
    if (!trimmed.startsWith("#")) continue;

    const offset = lineStarts[i]! + line.indexOf("#");
    if (inBlock(offset)) continue; // skip comments inside block scalars

    const text = trimmed.replace(/^#\s?/, "");
    const path =
      offset < (firstAstStart ?? Infinity)
        ? "document"
        : nearestFollowingPath(offset);

    comments.push({ line: i + 1, path, text });
  }

  return { comments };
}
