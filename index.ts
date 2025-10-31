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
 * Supports both full-line comments and inline trailing comments.
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

  // Build map of node positions and paths
  interface NodeInfo {
    start: number;
    end: number;
    path: string;
  }

  const nodes: NodeInfo[] = [];
  const blockRanges: Array<[number, number]> = [];
  const valueNodes: NodeInfo[] = []; // Track only scalar value nodes separately

  const keyStr = (k: unknown): string =>
    isScalar(k) ? String((k as any).value) : "<non-scalar-key>";

  // Walk AST to collect all nodes and their positions
  const walkAst = (node: any, path: (string | number)[]): void => {
    if (!node) return;

    const range = node.range;
    if (!range || range.length < 2) return;

    const start = range[0];
    const end = range[1];

    // Track block scalars to exclude their content
    if (node.type === "BLOCK_LITERAL" || node.type === "BLOCK_FOLDED") {
      blockRanges.push([start, end]);
    }

    // Track the node itself first (for comments before maps/sequences)
    if (path.length > 0 || isMap(node) || isSeq(node)) {
      nodes.push({
        start,
        end,
        path: path.join("."),
      });
    }

    // For key-value pairs, we need to track both key and value
    if (isMap(node)) {
      for (const pair of node.items || []) {
        const key = keyStr(pair.key);
        const keyRange = (pair.key as any).range;
        const valueRange = (pair.value as any).range;

        // Track the value node (which is what inline comments attach to)
        if (valueRange && valueRange.length >= 2) {
          const valueNode: NodeInfo = {
            start: valueRange[0],
            end: valueRange[1],
            path: [...path, key].join("."),
          };
          nodes.push(valueNode);

          // Only track scalar values, not map/seq values
          if (!isMap(pair.value) && !isSeq(pair.value)) {
            valueNodes.push(valueNode);
          }

          walkAst(pair.value, [...path, key]);
        }
      }
    } else if (isSeq(node)) {
      (node.items || []).forEach((child: any, i: number) => {
        walkAst(child, [...path, i]);
      });
    } else {
      // Scalar node - track as value node
      const scalarNode: NodeInfo = {
        start,
        end,
        path: path.join("."),
      };
      nodes.push(scalarNode);
      valueNodes.push(scalarNode);
    }
  };

  walkAst(doc.contents, []);

  // Sort nodes by start position
  nodes.sort((a, b) => a.start - b.start);

  // Find the first node start position
  const firstNodeStart = nodes.length > 0 ? nodes[0].start : Infinity;

  // Helper to check if offset is inside a block scalar
  const inBlock = (offset: number): boolean =>
    blockRanges.some(
      ([s, e]) => s != null && e != null && offset >= s && offset < e,
    );

  // Helper to check if offset is inside a scalar value node's actual content
  const inValueNode = (offset: number): boolean => {
    // Check if offset is strictly inside any VALUE node's range (not map/seq nodes)
    for (const node of valueNodes) {
      // Check if offset is within the node's range (strictly inside, not at boundaries)
      if (node.start < offset && offset < node.end) {
        return true;
      }
    }
    return false;
  };

  // Helper to find the node that starts at or after an offset
  const findNextNode = (offset: number): NodeInfo | null => {
    for (const node of nodes) {
      if (node.start >= offset) {
        return node;
      }
    }
    return null;
  };

  // Helper to find the node that contains an offset (for inline comments)
  const findNodeAtOffset = (offset: number): NodeInfo | null => {
    // Find the node on the same line that ends before or at this offset
    for (const node of nodes) {
      if (node.end <= offset && node.start <= offset) {
        // Check if on same line
        const nodeLineStart = src.substring(0, node.start).split("\n").length;
        const offsetLineStart = src.substring(0, offset).split("\n").length;
        if (nodeLineStart === offsetLineStart) {
          return node;
        }
      }
    }
    return null;
  };

  // Precompute line starts
  const lineStarts: number[] = [0];
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "\n") lineStarts.push(i + 1);
  }

  const lines = src.split(/\r?\n/);
  const comments: YamlComment[] = [];

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineStart = lineStarts[i]!;

    // Find all '#' characters in the line
    let hashIndex = 0;
    while ((hashIndex = line.indexOf("#", hashIndex)) !== -1) {
      const hashOffset = lineStart + hashIndex;

      // Skip if inside a block scalar
      if (inBlock(hashOffset)) {
        hashIndex++;
        continue;
      }

      // Check if this is a full-line comment (first non-whitespace is '#')
      const beforeHash = line.substring(0, hashIndex).trim();
      const isFullLineComment = beforeHash === "";

      // Skip if this # is inside a value node (like URLs with #)
      // But allow it if it's a full-line comment or trailing comment
      if (!isFullLineComment && inValueNode(hashOffset)) {
        // This # is part of a value, not a comment
        hashIndex++;
        continue;
      }

      // Extract comment text
      let commentText = line.substring(hashIndex + 1).trimStart();

      // Determine which node this comment belongs to
      let path = "document";

      if (isFullLineComment) {
        // Full-line comment: find the next node after this line
        const nextLineStart =
          i < lines.length - 1 ? lineStarts[i + 1]! : src.length;
        const node = findNextNode(nextLineStart);
        if (hashOffset < firstNodeStart) {
          // Comment is before first node
          path = "document";
        } else if (node) {
          path = node.path;
        }
      } else {
        // Inline comment: find the node on this line that ends before the hash
        const node = findNodeAtOffset(hashOffset);
        if (node) {
          path = node.path;
        } else {
          // Fallback: find next node
          const node = findNextNode(hashOffset);
          if (node) {
            path = node.path;
          }
        }
      }

      comments.push({
        line: i + 1,
        path,
        text: commentText,
      });

      // Only process the first '#' on a line (to avoid false positives from strings)
      break;
    }
  }

  return { comments };
}
