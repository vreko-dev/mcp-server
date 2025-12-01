# Configuration File Detection

## Overview

The configuration file detection system provides comprehensive detection of various configuration files across multiple technology stacks, including JavaScript/TypeScript, Python, CI/CD systems, and containerization tools.

## Implementation

The system is implemented through a centralized configuration pattern definition:

```typescript
export const CONFIG_FILE_PATTERNS = {
	javascript: {
		package: [
			"package.json",
			"package-lock.json",
			"pnpm-lock.yaml",
			"yarn.lock",
			"bun.lockb",
		],
		build: [
			"webpack.config.js",
			"webpack.config.ts",
			"vite.config.js",
			"vite.config.ts",
			"rollup.config.js",
			"rollup.config.ts",
			"esbuild.config.js",
			"rspack.config.js",
			"turbo.json",
		],
		typescript: ["tsconfig.json", "tsconfig.*.json", "jsconfig.json"],
		linting: [
			".eslintrc.js",
			".eslintrc.json",
			".eslintrc.yaml",
			"eslint.config.js",
			".prettierrc",
			".prettierrc.json",
			"prettier.config.js",
			"biome.json",
		],
		framework: [
			"next.config.js",
			"next.config.mjs",
			"nuxt.config.ts",
			"astro.config.mjs",
			"remix.config.js",
			"svelte.config.js",
			"angular.json",
			".vue.config.js",
		],
		testing: [
			"jest.config.js",
			"vitest.config.ts",
			"playwright.config.ts",
			"cypress.config.js",
		],
		env: [
			".env",
			".env.local",
			".env.production",
			".env.development",
			".env.test",
		],
	},

	python: {
		package: [
			"pyproject.toml",
			"requirements.txt",
			"requirements-dev.txt",
			"setup.py",
			"setup.cfg",
			"Pipfile",
			"Pipfile.lock",
			"poetry.lock",
			"uv.lock",
			"pdm.lock",
		],
		config: [
			"pyproject.toml",
			"setup.cfg",
			"mypy.ini",
			".mypy.ini",
			"pylintrc",
			".pylintrc",
			"ruff.toml",
			".flake8",
			"tox.ini",
			"pytest.ini",
		],
	},

	ci: [
		".github/workflows/*.yml",
		".gitlab-ci.yml",
		".circleci/config.yml",
		"azure-pipelines.yml",
	],

	containerization: ["Dockerfile", "docker-compose.yml", ".dockerignore"],
};
```

## File Type Detection

The system categorizes detected files by type to enable appropriate handling:

1. **JavaScript/TypeScript Configuration Files**

    - Package management files
    - Build tool configurations
    - TypeScript/JavaScript compiler options
    - Linting and formatting configurations
    - Framework-specific configurations
    - Testing configurations
    - Environment files

2. **Python Configuration Files**

    - Package management files
    - Linting and type checking configurations

3. **CI/CD Configuration Files**

    - GitHub Actions workflows
    - GitLab CI configurations
    - CircleCI configurations
    - Azure Pipelines configurations

4. **Containerization Files**
    - Docker configuration files
    - Docker Compose configurations

## Integration Points

The configuration file detection integrates with:

1. **File Scanner** - Uses patterns for comprehensive workspace scanning
2. **Semantic Checkpoint Namer** - Identifies configuration changes for naming checkpoints
3. **Risk Analyzer** - Detects configuration changes as risk factors
4. **Protection System** - Identifies files that should be protected from unintended changes
