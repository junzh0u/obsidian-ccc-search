/** TypeScript mirror of the `ccc search --json` output shape. */

export interface CccSearchResult {
	file_path: string;
	language: string;
	content: string;
	start_line: number;
	end_line: number;
	score: number;
}

export interface CccSearchResponse {
	/** msgspec struct tag; always "search". */
	type?: string;
	success: boolean;
	results: CccSearchResult[];
	total_returned: number;
	offset: number;
	message: string | null;
}
