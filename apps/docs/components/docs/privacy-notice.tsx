import Link from "next/link";

export function PrivacyNotice() {
	return (
		<div className="border-t border-slate-700/50 mt-12 pt-8">
			<p className="text-sm text-slate-400">
				<strong className="text-emerald-400">Privacy First:</strong> SnapBack works 100% offline on the Free
				plan. MCP is optional and requires explicit consent on paid plans.{" "}
				<Link href="/enterprise/security-privacy" className="underline hover:text-slate-300">
					Learn more →
				</Link>
			</p>
		</div>
	);
}
