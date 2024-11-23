/**
 * Generates a slug from a given string, replacing spaces and non-alphanumeric characters with underscores.
 * @param {string} input - The input string to convert to a slug.
 * @returns {string} The generated slug with underscores.
 */
export function createSlug(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, ''); // Remove leading and trailing underscores
}