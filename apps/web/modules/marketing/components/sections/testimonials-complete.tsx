"use client";
import { m } from "motion/react";

export function TestimonialsSection() {
	const testimonials = [
		{
			quote: "SnapBack saved my entire authentication system when Copilot suggested storing passwords in plain text. One click and I was back to safety.",
			name: "Sarah Chen",
			role: "Senior Developer",
			company: "TechCorp",
			handle: "@sarahbuilds",
			avatar: "/avatars/sarah.jpg",
		},
		{
			quote: "As a team lead, SnapBack gives me peace of mind. My junior developers can experiment with AI tools without fear of breaking production code.",
			name: "Marcus Johnson",
			role: "Engineering Manager",
			company: "StartupXYZ",
			handle: "@marcuscode",
			avatar: "/avatars/marcus.jpg",
		},
		{
			quote: "The checkpoint system is genius. It knows exactly when to save and when to let me work. No more manual git commits every 5 minutes.",
			name: "Elena Rodriguez",
			role: "Full Stack Developer",
			company: "DevStudio",
			handle: "@elenadevs",
			avatar: "/avatars/elena.jpg",
		},
	];

	return (
		<div className="container mx-auto">
			<div className="text-center mb-16">
				<h2 className="text-display font-black text-white mb-6">Developers love SnapBack</h2>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Join thousands of developers who code fearlessly with SnapBack protection
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
				{testimonials.map((testimonial, index) => (
					<TestimonialCard key={index} testimonial={testimonial} index={index} />
				))}
			</div>
		</div>
	);
}

const TestimonialCard = ({ testimonial, index }: { testimonial: any; index: number }) => {
	return (
		<m.div
			className="card-neon"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
		>
			<div className="mb-6">
				<p className="text-muted-foreground leading-relaxed italic">"{testimonial.quote}"</p>
			</div>

			<div className="flex items-center space-x-4">
				<div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
					<span className="text-primary font-semibold">
						{testimonial.name
							.split(" ")
							.map((n: string) => n[0])
							.join("")}
					</span>
				</div>
				<div>
					<div className="text-white font-semibold">{testimonial.name}</div>
					<div className="text-sm text-muted-foreground">
						{testimonial.role} at {testimonial.company}
					</div>
					<div className="text-sm text-primary">{testimonial.handle}</div>
				</div>
			</div>
		</m.div>
	);
};
