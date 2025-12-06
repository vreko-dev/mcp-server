"use client";

import { MagneticButton } from "@marketing/components/ui/magnetic-button";
import { SplitComparison } from "@marketing/components/ui/split-comparison";
import { m } from "motion/react";
import { useEffect, useState } from "react";

export function ProtectionPreview() {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const beforeCode = `// AI optimizing your code...
const express = require('express')
const app = express()

// Removing "unused" security middleware
app.get('/api/data', (req, res) => {
  // Direct database query (no validation)
  const query = req.query.sql
  db.raw(query).then(results => {
    res.json(results)
  })
})

// Exposing sensitive config
process.env.DB_PASSWORD = "admin123"
app.listen(3000)`;

	const afterCode = `// SnapBack checkpoint created ✓
const express = require('express')
const app = express()

// Security middleware preserved
app.use(helmet())
app.use(rateLimit())

app.get('/api/data', (req, res) => {
  // Parameterized query (safe)
  const id = validator.escape(req.query.id)
  db.query('SELECT * FROM data WHERE id = ?', [id])
    .then(results => res.json(results))
})

// Config secured ✓
const dbPassword = process.env.DB_PASSWORD
app.listen(3000)`;

	return (
		<section className="py-20 px-4 bg-gradient-to-b from-black to-slate-900">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<m.h2
						initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="text-4xl md:text-6xl font-bold text-white mb-6"
					>
						The Split-Second That{" "}
						<span className="bg-gradient-to-r from-[#FF6B35] to-[#EF4444] bg-clip-text text-transparent">
							Changes Everything
						</span>
					</m.h2>
					<p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">
						Watch the same AI prompt create destruction on the left, protection on the right.
					</p>
					<p className="text-lg text-gray-400 max-w-2xl mx-auto">
						Click the SnapBack button to see the magic happen.
					</p>
				</div>

				{/* Split Comparison Component */}
				<m.div
					initial={isMounted ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}
					className="mb-16"
				>
					<SplitComparison
						beforeCode={beforeCode}
						afterCode={afterCode}
						beforeTitle="[ AI OPTIMIZATION - UNPROTECTED ]"
						afterTitle="[ SNAPBACK PROTECTION ACTIVE ]"
						damageStart={0}
						damageEnd={47500}
						className="mb-8"
					/>
				</m.div>

				{/* Enhanced Call to Action */}
				<m.div
					initial={isMounted ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.5, duration: 0.8 }}
					className="text-center space-y-6"
				>
					<div className="max-w-2xl mx-auto mb-8">
						<h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
							Never lose another line of working code
						</h3>
						<p className="text-lg text-gray-300">
							Every AI interaction is automatically protected. Every change can be instantly reverted.
							<span className="text-matrix-green font-semibold"> Zero configuration required.</span>
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<MagneticButton
							variant="accent"
							className="px-8 py-6 text-lg font-semibold bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white border-0 shadow-xl"
							strength={0.8}
							radius={120}
							onClick={() => {
								const pricingSection = document.getElementById("pricing");
								if (pricingSection) {
									pricingSection.scrollIntoView({
										behavior: "smooth",
									});
								}
							}}
						>
							Join the Protected Side
						</MagneticButton>

						<MagneticButton
							variant="ghost"
							className="px-6 py-4 text-base font-semibold text-gray-300 hover:text-white border-gray-600 hover:border-gray-400"
							strength={0.4}
							radius={80}
							onClick={() => {
								window.open("https://docs.snapback.dev/demo", "_blank");
							}}
						>
							Watch Full Demo
						</MagneticButton>
					</div>
				</m.div>
			</div>
		</section>
	);
}
