import fs from "node:fs/promises";
import type { ScanResult, AnalysisResult } from "./types.js";

export type Artifact = ScanResult | AnalysisResult;

export async function readArtifact(filePath: string): Promise<Artifact> {
  const text = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(text) as Artifact;
  if (parsed.kind === "scan" || parsed.kind === "analysis") {
    return parsed;
  }
  throw new Error(`Unsupported artifact kind in ${filePath}: ${(parsed as { kind?: string }).kind}`);
}

export async function writeArtifact(
  filePath: string,
  artifact: Artifact
): Promise<void> {
  const text = JSON.stringify(artifact, null, 2);
  await fs.writeFile(filePath, text, "utf8");
}
