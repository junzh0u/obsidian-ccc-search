/** Thin execFile wrapper around `ccc search --json`. */

import { execFile } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";
import type { CccSearchResponse } from "./types";

const execFileAsync = promisify(execFile);

/** Cold daemon start loads the embedding model — allow much longer on the first query. */
const FIRST_QUERY_TIMEOUT_MS = 120_000;
const QUERY_TIMEOUT_MS = 30_000;
const TEST_TIMEOUT_MS = 10_000;
const MAX_BUFFER = 10 * 1024 * 1024;

interface ExecError extends Error {
	code?: string | number;
	killed?: boolean;
	signal?: NodeJS.Signals | null;
	stdout?: string;
	stderr?: string;
}

/**
 * Binaries to try in order: the configured path if set, otherwise bare `ccc`
 * with a `~/.local/bin/ccc` fallback. Obsidian launched from Finder inherits
 * launchd's minimal PATH, so the fallback matters.
 */
function candidateBinaries(configured: string): string[] {
	const explicit = configured.trim();
	if (explicit !== "") {
		return [explicit];
	}
	return ["ccc", path.join(os.homedir(), ".local", "bin", "ccc")];
}

function isAbortError(err: Error): boolean {
	return err.name === "AbortError";
}

/** Extract the machine-readable error `ccc search --json` emits on stdout on failure. */
function tryParseMessage(stdout: string | undefined): string | null {
	if (!stdout) {
		return null;
	}
	try {
		const parsed = JSON.parse(stdout) as CccSearchResponse;
		return parsed.message ?? null;
	} catch {
		return null;
	}
}

function toCccError(e: ExecError, bin: string): Error {
	if (isAbortError(e)) {
		return e; // stale-query cancellation — caller ignores it
	}
	if (e.killed && e.signal) {
		return new Error(`ccc timed out — the daemon may still be warming up. Try again.`);
	}
	const stderrTail = (e.stderr ?? "").trim().split("\n").slice(-3).join("\n");
	const detail = tryParseMessage(e.stdout) ?? (stderrTail !== "" ? stderrTail : e.message);
	return new Error(
		`ccc failed (${bin}): ${detail}\nCheck the ccc binary path in the CCC Semantic Search settings.`
	);
}

const NOT_FOUND_MESSAGE =
	'ccc binary not found. Set "ccc binary path" in the CCC Semantic Search settings.';

async function runCcc(
	configured: string,
	args: string[],
	opts: { cwd?: string; signal?: AbortSignal; timeout: number }
): Promise<string> {
	for (const bin of candidateBinaries(configured)) {
		try {
			const { stdout } = await execFileAsync(bin, args, { ...opts, maxBuffer: MAX_BUFFER });
			return stdout;
		} catch (err) {
			const e = err as ExecError;
			if (e.code === "ENOENT") {
				continue; // try the next candidate
			}
			throw toCccError(e, bin);
		}
	}
	throw new Error(NOT_FOUND_MESSAGE);
}

export interface SearchOptions {
	query: string;
	limit: number;
	refresh: boolean;
	/** Configured binary path from settings; "" = auto-detect. */
	cccPath: string;
	/** Vault base path — ccc's CWD-based project discovery and path filter rely on it. */
	cwd: string;
	/** Aborted when a newer keystroke supersedes this query. */
	signal: AbortSignal;
	/** First query since modal open — allows the long cold-start timeout. */
	firstQuery: boolean;
}

export async function search(opts: SearchOptions): Promise<CccSearchResponse> {
	const args = ["search", opts.query, "--json", "--limit", String(opts.limit)];
	if (opts.refresh) {
		args.push("--refresh");
	}
	const stdout = await runCcc(opts.cccPath, args, {
		cwd: opts.cwd,
		signal: opts.signal,
		timeout: opts.firstQuery ? FIRST_QUERY_TIMEOUT_MS : QUERY_TIMEOUT_MS,
	});
	return JSON.parse(stdout) as CccSearchResponse;
}

/**
 * Verify the ccc binary is reachable (runs `ccc --help`; ccc has no --version flag).
 * Returns the binary that responded.
 */
export async function testCcc(configured: string): Promise<string> {
	for (const bin of candidateBinaries(configured)) {
		try {
			await execFileAsync(bin, ["--help"], { timeout: TEST_TIMEOUT_MS, maxBuffer: MAX_BUFFER });
			return bin;
		} catch (err) {
			const e = err as ExecError;
			if (e.code === "ENOENT") {
				continue;
			}
			throw toCccError(e, bin);
		}
	}
	throw new Error(NOT_FOUND_MESSAGE);
}
