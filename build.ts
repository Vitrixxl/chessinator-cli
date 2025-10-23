import envPaths from "env-paths";
import { mkdir, copyFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import duckdb from "duckdb";

await mkdir("dist", { recursive: true });

const buildResult = await Bun.build({
  entrypoints: ["./index.tsx"],
  outdir: "./dist",
  target: "bun",
  minify: true,
});

console.log(
  buildResult.success
    ? "App builded"
    : "Error while building" + buildResult.logs.join("\n"),
);

console.log("initializing db");
const paths = envPaths("chessinator-cli", { suffix: "" });
await mkdir(paths.data, { recursive: true });

// Download puzzle database if not exists
const puzzleDbPath = "./puzzle.db";
if (!!existsSync(puzzleDbPath)) {
  console.log("Puzzle database not found, downloading from Lichess...");

  const url = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
  const zstFile = "./lichess_db_puzzle.csv.zst";
  const csvFile = "./lichess_db_puzzle.csv";

  // Download with progress bar
  console.log("Downloading puzzle database...");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const totalSize = parseInt(response.headers.get("content-length") || "0");
  let downloadedSize = 0;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    downloadedSize += value.length;

    const percentage =
      totalSize > 0 ? ((downloadedSize / totalSize) * 100).toFixed(1) : "?";
    const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2);
    const totalMB = totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(2) : "?";

    process.stdout.write(
      `\rDownloading: ${downloadedMB}MB / ${totalMB}MB (${percentage}%)`,
    );
  }

  console.log("\nDownload complete!");

  // Save the downloaded file
  const fileData = new Uint8Array(downloadedSize);
  let offset = 0;
  for (const chunk of chunks) {
    fileData.set(chunk, offset);
    offset += chunk.length;
  }
  await Bun.write(zstFile, fileData);

  // Decompress using zstd
  console.log("Decompressing file...");
  const decompressProc = Bun.spawn(["zstd", "-d", zstFile, "-o", csvFile], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await decompressProc.exited;
  console.log("Decompression complete!");

  // Create database using duckdb
  console.log("Creating database with DuckDB...");
  const db = new duckdb.Database(":memory:");

  await new Promise((resolve, reject) => {
    db.run(
      `ATTACH '${puzzleDbPath}' AS sqlite (TYPE sqlite);
CREATE TABLE sqlite.puzzle AS SELECT * FROM read_csv_auto('./${csvFile}', SAMPLE_SIZE=-1);
CREATE TABLE sqlite.solved (id VARCHAR);
DETACH DATABASE sqlite;`,
      (err: Error) => {
        if (err) reject(err);
        else resolve(null);
      }
    );
  });

  db.close();
  console.log("Database created successfully!");

  // Clean up temporary files
  console.log("Cleaning up temporary files...");
  await unlink(zstFile);
  await unlink(csvFile);
  console.log("Cleanup complete!");
}

await copyFile("./puzzle.db", path.join(paths.data, "puzzle.db"));
console.log("db initialized");
