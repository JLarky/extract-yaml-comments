import { describe, it, expect } from "bun:test";
import { extractYamlComments, type YamlComment } from "./index";

describe("extractYamlComments", () => {
  it("should extract simple comments", () => {
    const yaml = "a: 1\n# greeting\nb: 2";
    const { comments } = extractYamlComments(yaml);
    expect(comments).toEqual([{ line: 2, path: "b", text: "greeting" }]);
  });

  it("should extract comments before document", () => {
    const yaml = "# This is a config\na: 1\n# greeting\nb: 2";
    const { comments } = extractYamlComments(yaml);
    expect(comments).toHaveLength(2);
    expect(comments[0]).toEqual({
      line: 1,
      path: "document",
      text: "This is a config",
    });
    expect(comments[1]).toEqual({
      line: 3,
      path: "b",
      text: "greeting",
    });
  });

  it("should handle multiple comments", () => {
    const yaml = `# Config file
name: John
# Age info
age: 30
# Active user
active: true`;
    const { comments } = extractYamlComments(yaml);
    expect(comments).toHaveLength(3);
    expect(comments[0]).toEqual({
      line: 1,
      path: "document",
      text: "Config file",
    });
    expect(comments[1]).toEqual({
      line: 3,
      path: "age",
      text: "Age info",
    });
    expect(comments[2]).toEqual({
      line: 5,
      path: "active",
      text: "Active user",
    });
  });

  it("should map comments to nested paths", () => {
    const yaml = `person:
  # User name
  name: John
  # User age
  age: 30`;
    const { comments } = extractYamlComments(yaml);
    expect(comments).toHaveLength(2);
    // Comments are mapped to the nearest following node
    expect(comments[0]).toEqual({
      line: 2,
      path: "person",
      text: "User name",
    });
    expect(comments[1]).toEqual({
      line: 4,
      path: "person.age",
      text: "User age",
    });
  });

  it("should skip comments inside block scalars", () => {
    const yaml = `description: |
  This is a
  # not a comment
  multiline string
note: important`;
    const { comments } = extractYamlComments(yaml);
    expect(comments).toHaveLength(0);
  });

  it("should handle inline hash in strings", () => {
    const yaml = `url: https://example.com
# This is a comment
path: /api#endpoint`;
    const { comments } = extractYamlComments(yaml);
    expect(comments).toHaveLength(1);
    expect(comments[0]).toEqual({
      line: 2,
      path: "path",
      text: "This is a comment",
    });
  });

  it("should handle comments with various spacing", () => {
    const yaml = `# comment with space
a: 1
#comment without space
b: 2`;
    const { comments } = extractYamlComments(yaml);
    expect(comments).toHaveLength(2);
    expect(comments[0].text).toBe("comment with space");
    expect(comments[1].text).toBe("comment without space");
  });

  it("should handle arrays with comments", () => {
    const yaml = `items:
  # First item
  - one
  # Second item
  - two`;
    const { comments } = extractYamlComments(yaml);
    expect(comments).toHaveLength(2);
    expect(comments[0]).toEqual({
      line: 2,
      path: "items",
      text: "First item",
    });
    expect(comments[1]).toEqual({
      line: 4,
      path: "items.1",
      text: "Second item",
    });
  });

  it("should return empty array for YAML without comments", () => {
    const yaml = `name: John
age: 30
active: true`;
    const { comments } = extractYamlComments(yaml);
    expect(comments).toEqual([]);
  });
});
