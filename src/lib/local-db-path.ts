/**
 * LOCAL DEVELOPMENT DATABASE LOCATION (PGlite)
 *
 * Kept free of framework imports so it can be unit-tested on its own.
 * PGlite creates only the LAST folder of its path, so a missing parent such as ".data" makes it fail with
 * "ENOENT: mkdir .data/pglite". We create the whole path (recursively) before opening the database.
 * Existing folders and the data inside them are never touched.
 */
import fs from "node:fs";
import path from "node:path";

/** Absolute folder used by the local database. PGLITE_DIR overrides it; relative paths are resolved from the project folder. */
export function localDbDir(env: Record<string, string | undefined> = process.env, cwd: string = process.cwd()): string {
  const custom = (env.PGLITE_DIR ?? "").trim();
  return path.resolve(cwd, custom || path.join(".data", "pglite"));
}

/** Creates the folder (and any missing parents). Safe to call repeatedly; never deletes anything. */
export function prepareLocalDbDir(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
    if (code === "EEXIST" && fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) throw new Error("The local database path exists but is not a folder. Remove it or set PGLITE_DIR to another folder.");
    throw new Error(`Cannot create the local database folder (${code}). Check that the project folder is writable, or set PGLITE_DIR to a writable folder.`);
  }
  const st = fs.statSync(dir);
  if (!st.isDirectory()) throw new Error("The local database path exists but is not a folder. Remove it or set PGLITE_DIR to another folder.");
}
