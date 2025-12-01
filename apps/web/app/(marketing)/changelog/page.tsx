import { ChangelogSection } from "@marketing/changelog/components/ChangelogSection";

export default async function PricingPage() {
	return (
		<div className="container max-w-3xl pt-32 pb-16">
			<div className="mb-12 text-balance pt-8 text-center">
				<h1 className="mb-2 font-bold text-5xl">Changelog</h1>
				<p className="text-lg opacity-50">
					Stay up to date with our latest improvements
				</p>
			</div>
			<ChangelogSection
				items={[
					{
						date: "2024-03-01",
						changes: ["🚀 Improved performance"],
					},
					{
						date: "2024-02-01",
						changes: ["🎨 Updated design", "🐞 Fixed a bug"],
					},
					{
						date: "2024-01-01",
						changes: ["🎉 Added new feature", "🐞 Fixed a bug"],
					},
				]}
			/>
		</div>
	);
}
