import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";
import React from "react";

// Import global styles - adjust path if needed
import "../app/globals.css";

const preview: Preview = {
	parameters: {
		actions: { argTypesRegex: "^on[A-Z].*" },
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
			expanded: true,
			sort: "requiredFirst",
		},
		backgrounds: {
			default: "light",
			values: [
				{
					name: "light",
					value: "#ffffff",
				},
				{
					name: "dark",
					value: "#0a0a0a",
				},
				{
					name: "gray",
					value: "#f5f5f5",
				},
			],
		},
		viewport: {
			viewports: {
				mobile: {
					name: "Mobile",
					styles: {
						width: "375px",
						height: "667px",
					},
				},
				mobileLandscape: {
					name: "Mobile Landscape",
					styles: {
						width: "667px",
						height: "375px",
					},
				},
				tablet: {
					name: "Tablet",
					styles: {
						width: "768px",
						height: "1024px",
					},
				},
				desktop: {
					name: "Desktop",
					styles: {
						width: "1440px",
						height: "900px",
					},
				},
				wide: {
					name: "Wide Desktop",
					styles: {
						width: "1920px",
						height: "1080px",
					},
				},
			},
		},
		layout: "centered",
	},

	decorators: [
		// Theme decorator for dark/light mode switching
		withThemeByClassName({
			themes: {
				light: "",
				dark: "dark",
			},
			defaultTheme: "light",
		}),
		// Global wrapper decorator
		(Story) => (
			<div className="font-sans antialiased">
				<Story />
			</div>
		),
	],

	tags: ["autodocs"],

	// Global types for custom toolbar items
	globalTypes: {
		locale: {
			name: "Locale",
			description: "Internationalization locale",
			defaultValue: "en",
			toolbar: {
				icon: "globe",
				items: [
					{ value: "en", title: "English" },
					{ value: "es", title: "Español" },
				],
				showName: true,
			},
		},
	},
};

export default preview;
