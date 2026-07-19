import { describe, it, expect } from "vitest";
import { classifyExtension } from "../src/scanner/classify.js";

describe("classifyExtension", () => {
  it("returns video for mkv, mp4", () => {
    expect(classifyExtension("mkv")).toBe("video");
    expect(classifyExtension("MP4")).toBe("video");
  });
  it("returns audio for mp3, flac", () => {
    expect(classifyExtension("mp3")).toBe("audio");
    expect(classifyExtension("flac")).toBe("audio");
  });
  it("returns subtitle for srt, vtt", () => {
    expect(classifyExtension("srt")).toBe("subtitle");
    expect(classifyExtension("vtt")).toBe("subtitle");
  });
  it("returns image for jpg, png", () => {
    expect(classifyExtension("jpg")).toBe("image");
    expect(classifyExtension("png")).toBe("image");
  });
  it("returns nfo for nfo", () => {
    expect(classifyExtension("nfo")).toBe("nfo");
  });
  it("returns other for unknown", () => {
    expect(classifyExtension("xyz")).toBe("other");
    expect(classifyExtension("")).toBe("other");
  });
});
