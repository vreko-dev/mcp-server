import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@ui/components/card";

const meta = {
	title: "UI/Primitives/Card",
	component: Card,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		className: {
			control: "text",
			description: "Additional CSS classes",
		},
	},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>SnapBack Protection</CardTitle>
				<CardDescription>Automatic version control for your code changes.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm">
					SnapBack automatically creates snapshots every time you save, giving you the freedom to experiment
					without fear of losing your work.
				</p>
			</CardContent>
			<CardFooter className="flex justify-between">
				<button className="text-sm text-muted-foreground hover:text-foreground">Learn More</button>
				<button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Enable</button>
			</CardFooter>
		</Card>
	),
};

export const Simple: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Simple Card</CardTitle>
				<CardDescription>This card has minimal content.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					A basic card with just a title, description, and content.
				</p>
			</CardContent>
		</Card>
	),
};

export const WithoutDescription: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>API Key Created</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="rounded-md bg-muted p-3 font-mono text-sm">sk_live_abc123...xyz789</div>
					<p className="text-xs text-muted-foreground">Save this key securely. It won't be shown again.</p>
				</div>
			</CardContent>
		</Card>
	),
};

export const Interactive: Story = {
	render: () => (
		<Card className="w-[350px] cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
			<CardHeader>
				<CardTitle>Clickable Feature Card</CardTitle>
				<CardDescription>This card responds to hover interactions.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm">Try hovering over this card to see the shadow and border effects.</p>
			</CardContent>
		</Card>
	),
};

export const WithStats: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Usage Statistics</CardTitle>
				<CardDescription>Your SnapBack activity this month</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="text-2xl font-bold">1,247</p>
						<p className="text-xs text-muted-foreground">Snapshots Created</p>
					</div>
					<div>
						<p className="text-2xl font-bold">23</p>
						<p className="text-xs text-muted-foreground">Restores</p>
					</div>
					<div>
						<p className="text-2xl font-bold">156</p>
						<p className="text-xs text-muted-foreground">Protected Files</p>
					</div>
					<div>
						<p className="text-2xl font-bold">99.2%</p>
						<p className="text-xs text-muted-foreground">Uptime</p>
					</div>
				</div>
			</CardContent>
		</Card>
	),
};

export const LoginForm: Story = {
	render: () => (
		<Card className="w-[400px]">
			<CardHeader>
				<CardTitle>Sign In to SnapBack</CardTitle>
				<CardDescription>Enter your credentials to access your account.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium">
						Email
					</label>
					<input
						id="email"
						type="email"
						placeholder="you@example.com"
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>
				<div className="space-y-2">
					<label htmlFor="password" className="text-sm font-medium">
						Password
					</label>
					<input
						id="password"
						type="password"
						placeholder="••••••••"
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				<button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
					Sign In
				</button>
				<button className="w-full text-sm text-muted-foreground hover:text-foreground">Forgot password?</button>
			</CardFooter>
		</Card>
	),
};

export const DarkMode: Story = {
	render: () => (
		<div className="dark">
			<div className="bg-background p-8">
				<Card className="w-[350px]">
					<CardHeader>
						<CardTitle>Dark Mode Card</CardTitle>
						<CardDescription>Cards automatically adapt to dark theme.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							The card component uses semantic color tokens that work in both light and dark modes.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	),
	parameters: {
		backgrounds: { default: "dark" },
	},
};

export const Grid: Story = {
	render: () => (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ maxWidth: "1200px" }}>
			<Card>
				<CardHeader>
					<CardTitle>Solo Plan</CardTitle>
					<CardDescription>Perfect for individual developers</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-3xl font-bold">$9</p>
					<p className="text-sm text-muted-foreground">per month</p>
				</CardContent>
				<CardFooter>
					<button className="w-full rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent">
						Choose Plan
					</button>
				</CardFooter>
			</Card>

			<Card className="border-primary">
				<CardHeader>
					<CardTitle>Team Plan</CardTitle>
					<CardDescription>For small development teams</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-3xl font-bold">$29</p>
					<p className="text-sm text-muted-foreground">per month</p>
				</CardContent>
				<CardFooter>
					<button className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
						Choose Plan
					</button>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Enterprise</CardTitle>
					<CardDescription>Custom solutions for large teams</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-3xl font-bold">Custom</p>
					<p className="text-sm text-muted-foreground">contact us</p>
				</CardContent>
				<CardFooter>
					<button className="w-full rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent">
						Contact Sales
					</button>
				</CardFooter>
			</Card>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};

export const AllStates: Story = {
	render: () => (
		<div className="flex flex-col gap-4" style={{ width: "350px" }}>
			<Card>
				<CardHeader>
					<CardTitle>Default State</CardTitle>
					<CardDescription>Normal card appearance</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm">Standard card styling</p>
				</CardContent>
			</Card>

			<Card className="border-primary">
				<CardHeader>
					<CardTitle>Highlighted State</CardTitle>
					<CardDescription>With primary border</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm">Use for featured content</p>
				</CardContent>
			</Card>

			<Card className="opacity-60">
				<CardHeader>
					<CardTitle>Disabled State</CardTitle>
					<CardDescription>Reduced opacity</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm">Use for unavailable options</p>
				</CardContent>
			</Card>

			<Card className="border-destructive">
				<CardHeader>
					<CardTitle>Error State</CardTitle>
					<CardDescription className="text-destructive">Something went wrong</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm">Use destructive border for errors</p>
				</CardContent>
			</Card>
		</div>
	),
	parameters: {
		layout: "centered",
	},
};
