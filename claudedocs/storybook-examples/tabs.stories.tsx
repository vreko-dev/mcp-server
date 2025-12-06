import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";

const meta = {
	title: "UI/Primitives/Tabs",
	component: Tabs,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		defaultValue: {
			control: "text",
			description: "The initially selected tab",
		},
		orientation: {
			control: "select",
			options: ["horizontal", "vertical"],
			description: "Tab list orientation",
		},
	},
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Tabs defaultValue="overview" className="w-[400px]">
			<TabsList>
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="analytics">Analytics</TabsTrigger>
				<TabsTrigger value="settings">Settings</TabsTrigger>
			</TabsList>
			<TabsContent value="overview">
				<p className="text-sm text-muted-foreground">
					Overview tab content. View your dashboard summary and key metrics.
				</p>
			</TabsContent>
			<TabsContent value="analytics">
				<p className="text-sm text-muted-foreground">
					Analytics tab content. Detailed statistics and usage patterns.
				</p>
			</TabsContent>
			<TabsContent value="settings">
				<p className="text-sm text-muted-foreground">
					Settings tab content. Configure your workspace preferences.
				</p>
			</TabsContent>
		</Tabs>
	),
};

export const WithCards: Story = {
	render: () => (
		<Tabs defaultValue="snapshots" className="w-[600px]">
			<TabsList>
				<TabsTrigger value="snapshots">Snapshots</TabsTrigger>
				<TabsTrigger value="protected">Protected Files</TabsTrigger>
				<TabsTrigger value="history">History</TabsTrigger>
			</TabsList>

			<TabsContent value="snapshots">
				<Card>
					<CardHeader>
						<CardTitle>Recent Snapshots</CardTitle>
						<CardDescription>Your automatically created version snapshots</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between rounded-md border p-3">
								<div>
									<p className="text-sm font-medium">auth.ts</p>
									<p className="text-xs text-muted-foreground">2 minutes ago</p>
								</div>
								<button className="text-xs text-primary hover:underline">Restore</button>
							</div>
							<div className="flex items-center justify-between rounded-md border p-3">
								<div>
									<p className="text-sm font-medium">api-client.ts</p>
									<p className="text-xs text-muted-foreground">15 minutes ago</p>
								</div>
								<button className="text-xs text-primary hover:underline">Restore</button>
							</div>
						</div>
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="protected">
				<Card>
					<CardHeader>
						<CardTitle>Protected Files</CardTitle>
						<CardDescription>Files currently under automatic protection</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between rounded-md border p-3">
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 rounded-full bg-green-500" />
									<div>
										<p className="text-sm font-medium">src/lib/auth.ts</p>
										<p className="text-xs text-muted-foreground">Protected • High priority</p>
									</div>
								</div>
							</div>
							<div className="flex items-center justify-between rounded-md border p-3">
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 rounded-full bg-green-500" />
									<div>
										<p className="text-sm font-medium">src/api/client.ts</p>
										<p className="text-xs text-muted-foreground">Protected • Medium priority</p>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="history">
				<Card>
					<CardHeader>
						<CardTitle>Activity History</CardTitle>
						<CardDescription>Your recent SnapBack actions</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3 text-sm">
							<div className="flex items-start gap-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
									✓
								</div>
								<div>
									<p className="font-medium">Snapshot created</p>
									<p className="text-xs text-muted-foreground">auth.ts • 2 minutes ago</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
									↻
								</div>
								<div>
									<p className="font-medium">File restored</p>
									<p className="text-xs text-muted-foreground">config.json • 1 hour ago</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	),
	parameters: {
		layout: "padded",
	},
};

export const FullWidth: Story = {
	render: () => (
		<div className="w-full max-w-4xl">
			<Tabs defaultValue="code" className="w-full">
				<TabsList className="w-full justify-start">
					<TabsTrigger value="code">Code</TabsTrigger>
					<TabsTrigger value="preview">Preview</TabsTrigger>
					<TabsTrigger value="console">Console</TabsTrigger>
				</TabsList>
				<TabsContent value="code" className="min-h-[200px] rounded-md border p-4">
					<pre className="text-sm">
						<code>{`function createSnapshot(file: string) {
  // Snapshot logic here
  return snapshot;
}`}</code>
					</pre>
				</TabsContent>
				<TabsContent value="preview" className="min-h-[200px] rounded-md border p-4">
					<div className="flex items-center justify-center">
						<p className="text-muted-foreground">Preview output would appear here</p>
					</div>
				</TabsContent>
				<TabsContent
					value="console"
					className="min-h-[200px] rounded-md border bg-black p-4 font-mono text-sm text-green-400"
				>
					<div>$ snapback init</div>
					<div>✓ SnapBack initialized successfully</div>
					<div>✓ Protection enabled for 156 files</div>
				</TabsContent>
			</Tabs>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};

export const PricingTabs: Story = {
	render: () => (
		<Tabs defaultValue="monthly" className="w-[500px]">
			<TabsList className="grid w-full grid-cols-2">
				<TabsTrigger value="monthly">Monthly</TabsTrigger>
				<TabsTrigger value="annual">Annual (Save 20%)</TabsTrigger>
			</TabsList>

			<TabsContent value="monthly">
				<div className="grid gap-4 pt-4">
					<Card>
						<CardHeader>
							<CardTitle>Solo Plan</CardTitle>
							<CardDescription>Perfect for individual developers</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold">
								$9<span className="text-lg font-normal text-muted-foreground">/mo</span>
							</p>
							<ul className="mt-4 space-y-2 text-sm">
								<li className="flex items-center gap-2">
									<span className="text-green-500">✓</span>
									Unlimited snapshots
								</li>
								<li className="flex items-center gap-2">
									<span className="text-green-500">✓</span>
									30-day retention
								</li>
								<li className="flex items-center gap-2">
									<span className="text-green-500">✓</span>
									Priority support
								</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			<TabsContent value="annual">
				<div className="grid gap-4 pt-4">
					<Card className="border-primary">
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>Solo Plan</span>
								<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
									Save $21
								</span>
							</CardTitle>
							<CardDescription>Perfect for individual developers</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold">
								$86
								<span className="text-lg font-normal text-muted-foreground">/year</span>
							</p>
							<p className="mt-1 text-sm text-muted-foreground">$7.17 per month</p>
							<ul className="mt-4 space-y-2 text-sm">
								<li className="flex items-center gap-2">
									<span className="text-green-500">✓</span>
									Unlimited snapshots
								</li>
								<li className="flex items-center gap-2">
									<span className="text-green-500">✓</span>
									30-day retention
								</li>
								<li className="flex items-center gap-2">
									<span className="text-green-500">✓</span>
									Priority support
								</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</TabsContent>
		</Tabs>
	),
};

export const DarkMode: Story = {
	render: () => (
		<div className="dark">
			<div className="bg-background p-8">
				<Tabs defaultValue="features" className="w-[400px]">
					<TabsList>
						<TabsTrigger value="features">Features</TabsTrigger>
						<TabsTrigger value="pricing">Pricing</TabsTrigger>
						<TabsTrigger value="docs">Docs</TabsTrigger>
					</TabsList>
					<TabsContent value="features">
						<p className="text-sm text-muted-foreground">Tabs automatically adapt to dark mode theme.</p>
					</TabsContent>
					<TabsContent value="pricing">
						<p className="text-sm text-muted-foreground">
							View our pricing plans and choose the best option.
						</p>
					</TabsContent>
					<TabsContent value="docs">
						<p className="text-sm text-muted-foreground">Read our documentation to get started.</p>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	),
	parameters: {
		backgrounds: { default: "dark" },
	},
};

export const Disabled: Story = {
	render: () => (
		<Tabs defaultValue="active" className="w-[400px]">
			<TabsList>
				<TabsTrigger value="active">Active</TabsTrigger>
				<TabsTrigger value="disabled" disabled>
					Disabled
				</TabsTrigger>
				<TabsTrigger value="locked" disabled>
					Locked 🔒
				</TabsTrigger>
			</TabsList>
			<TabsContent value="active">
				<p className="text-sm text-muted-foreground">
					Active tab content. Other tabs are disabled and cannot be clicked.
				</p>
			</TabsContent>
			<TabsContent value="disabled">
				<p className="text-sm text-muted-foreground">
					This content won't be shown because the tab is disabled.
				</p>
			</TabsContent>
			<TabsContent value="locked">
				<p className="text-sm text-muted-foreground">This content requires upgrading your plan.</p>
			</TabsContent>
		</Tabs>
	),
};

export const IconTabs: Story = {
	render: () => (
		<Tabs defaultValue="files" className="w-[500px]">
			<TabsList>
				<TabsTrigger value="files" className="gap-2">
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
						/>
					</svg>
					Files
				</TabsTrigger>
				<TabsTrigger value="snapshots" className="gap-2">
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					Snapshots
				</TabsTrigger>
				<TabsTrigger value="settings" className="gap-2">
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					Settings
				</TabsTrigger>
			</TabsList>
			<TabsContent value="files">
				<p className="text-sm text-muted-foreground">Files content</p>
			</TabsContent>
			<TabsContent value="snapshots">
				<p className="text-sm text-muted-foreground">Snapshots content</p>
			</TabsContent>
			<TabsContent value="settings">
				<p className="text-sm text-muted-foreground">Settings content</p>
			</TabsContent>
		</Tabs>
	),
};
