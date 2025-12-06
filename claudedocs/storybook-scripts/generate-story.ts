#!/usr/bin/env tsx
/**
 * Story Generator Script
 *
 * Usage:
 *   tsx generate-story.ts <ComponentName> <path> [category]
 *
 * Examples:
 *   tsx generate-story.ts Badge apps/web/modules/ui/components UI
 *   tsx generate-story.ts HeroSection apps/web/modules/marketing/components Marketing
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";

interface StoryConfig {
	componentName: string;
	componentPath: string;
	category: "UI" | "Marketing" | "Layout" | "Forms";
	subCategory?: string;
}

function generateStory(config: StoryConfig): string {
	const { componentName, category, subCategory } = config;
	const title = subCategory ? `${category}/${subCategory}/${componentName}` : `${category}/${componentName}`;

	return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta = {
  title: '${title}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    // TODO: Add prop controls based on component props
    // Example:
    // variant: {
    //   control: 'select',
    //   options: ['default', 'primary', 'secondary'],
    //   description: 'Visual style variant',
    // },
  },
} satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // TODO: Add default props
  },
};

export const Interactive: Story = {
  args: {
    // TODO: Add interactive props (onClick, onChange, etc.)
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      {/* TODO: Render all component variants */}
      <${componentName} />
    </div>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark">
      <div className="bg-background p-8">
        <${componentName} />
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

// TODO: Add more stories for different states:
// - Loading
// - Error
// - Disabled
// - With different data
// - Edge cases
`;
}

function inferCategory(path: string): "UI" | "Marketing" | "Layout" | "Forms" {
	if (path.includes("/ui/")) return "UI";
	if (path.includes("/marketing/")) return "Marketing";
	if (path.includes("/layout/")) return "Layout";
	if (path.includes("/forms/")) return "Forms";
	return "UI";
}

function inferSubCategory(path: string): string | undefined {
	if (path.includes("/ui/components/")) {
		// Check for common subcategories
		if (path.includes("/primitives/")) return "Primitives";
		if (path.includes("/composed/")) return "Composed";
		if (path.includes("/magic/")) return "Magic";
	}
	if (path.includes("/marketing/components/")) {
		if (path.includes("/sections/")) return "Sections";
		if (path.includes("/ui/")) return "Components";
	}
	return undefined;
}

function extractComponentName(filePath: string): string | null {
	try {
		const content = readFileSync(filePath, "utf-8");

		// Try to find export pattern
		const exportMatch = content.match(/export\s+(?:const|function)\s+(\w+)/);
		if (exportMatch) return exportMatch[1];

		// Try to find component name from file
		const fileName = basename(filePath, ".tsx");
		return fileName.charAt(0).toUpperCase() + fileName.slice(1);
	} catch {
		return null;
	}
}

function main() {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.error(`
Usage: tsx generate-story.ts <ComponentName> <path> [category]

Arguments:
  ComponentName  Name of the component (e.g., Badge, HeroSection)
  path          Path to component directory (e.g., apps/web/modules/ui/components)
  category      Optional: UI, Marketing, Layout, Forms (auto-detected if omitted)

Examples:
  tsx generate-story.ts Badge apps/web/modules/ui/components
  tsx generate-story.ts HeroSection apps/web/modules/marketing/components Marketing
  tsx generate-story.ts NavBar apps/web/components Layout

Auto-discovery mode:
  tsx generate-story.ts --scan apps/web/modules/ui/components
    `);
		process.exit(1);
	}

	// Scan mode
	if (args[0] === "--scan") {
		const scanPath = args[1];
		console.log(`Scanning ${scanPath} for components without stories...`);
		// TODO: Implement scanning logic
		console.log("Scan mode not yet implemented");
		return;
	}

	const componentName = args[0];
	const componentPath = args[1];
	const category = (args[2] || inferCategory(componentPath)) as StoryConfig["category"];
	const subCategory = inferSubCategory(componentPath);

	const config: StoryConfig = {
		componentName,
		componentPath,
		category,
		subCategory,
	};

	// Determine story file path
	let storyPath: string;

	// If path ends with .tsx, replace extension
	if (componentPath.endsWith(".tsx") || componentPath.endsWith(".ts")) {
		storyPath = componentPath.replace(/\.tsx?$/, ".stories.tsx");
	} else {
		// Assume it's a directory
		storyPath = join(componentPath, `${componentName}.stories.tsx`);
	}

	if (existsSync(storyPath)) {
		console.error(`❌ Story already exists: ${storyPath}`);
		console.error("   Use --force to overwrite (not implemented)");
		process.exit(1);
	}

	const storyContent = generateStory(config);
	writeFileSync(storyPath, storyContent, "utf-8");

	console.log(`✅ Created story: ${storyPath}`);
	console.log(
		`   Title: ${config.subCategory ? `${config.category}/${config.subCategory}/${componentName}` : `${config.category}/${componentName}`}`,
	);
	console.log("\nNext steps:");
	console.log(`1. Open ${storyPath}`);
	console.log("2. Update argTypes based on component props");
	console.log("3. Add realistic example data to Default story");
	console.log("4. Create stories for all component variants");
	console.log("5. Test in Storybook: pnpm --filter @snapback/web storybook");
}

main();
