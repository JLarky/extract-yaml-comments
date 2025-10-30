# extract-yaml-comments

Extract comments from YAML files and map them to the nearest following YAML node.

This tool parses YAML documents and extracts all comments, providing structured metadata about where each comment appears and which YAML node it precedes. Comments inside block scalars are automatically excluded.

## CLI Usage

### Example: Extracting Comments from YAML

Input file (`config.yml`):

```yaml
# Application configuration
name: MyApp
# Database connection
database:
  # Host address
  host: localhost
  # Port number
  port: 5432
```

**Bun:**

```bash
bunx @jlarky/extract-yaml-comments config.yml
```

**Node.js:**

```bash
npx @jlarky/extract-yaml-comments config.yml
```

**Deno:**

```bash
deno run --allow-read jsr:@jlarky/extract-yaml-comments/cli config.yml
```

Output:

```
// original comment from line 1 (before document): "Application configuration"

// original comment from line 3 (before database): "Database connection"

// original comment from line 5 (before database): "Host address"

// original comment from line 7 (before database.port): "Port number"
```

### CLI Options

```
extract-yaml-comments [file]

Required:
  file                            YAML file to extract comments from

Optional:
  --help                          Show help
```

## Installation

If you want to use the CLI tool:

### If using Bun:

```bash
bunx @jlarky/extract-yaml-comments config.yml
```

Or install locally:

```bash
bun add @jlarky/extract-yaml-comments
```

### If using Node.js:

```bash
npx @jlarky/extract-yaml-comments config.yml
```

Or install via npm:

```bash
npm install @jlarky/extract-yaml-comments
```

Or via jsr:

```bash
npx jsr add @jlarky/extract-yaml-comments
```

### If using Deno:

```bash
deno run --allow-read jsr:@jlarky/extract-yaml-comments/cli config.yml
```

Or add to your project:

```bash
deno add jsr:@jlarky/extract-yaml-comments
```

### If using nypm (multi-runtime):

```bash
nypm add @jlarky/extract-yaml-comments
```

## Library Usage

```typescript
import { extractYamlComments } from "@jlarky/extract-yaml-comments";

const yaml = `
# Configuration file
database:
  # Database host
  host: localhost
`;

const { comments } = extractYamlComments(yaml);
console.log(comments);
// [
//   { line: 2, path: "document", text: "Configuration file" },
//   { line: 4, path: "database", text: "Database host" }
// ]
```

### API

#### `extractYamlComments(src: string): ExtractYamlCommentsResult`

Extracts comments from a YAML document.

**Parameters:**

- `src` - The YAML document source code as a string

**Returns:**

- An object with a `comments` array containing `YamlComment` objects

#### `YamlComment` Interface

```typescript
interface YamlComment {
  line: number; // Line number where comment appears (1-indexed)
  path: string; // Path to nearest following YAML node
  text: string; // Comment text without '#' prefix
}
```

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, testing, and publishing guidelines.

## License

MIT
