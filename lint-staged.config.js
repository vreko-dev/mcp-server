module.exports = {
	"*.{js,jsx,ts,tsx}": [
		"biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
		"biome format --write --no-errors-on-unmatched --files-ignore-unknown=true",
	],
	"*.{json,md,yml,yaml}": ["biome format --write --no-errors-on-unmatched --files-ignore-unknown=true"],
};
