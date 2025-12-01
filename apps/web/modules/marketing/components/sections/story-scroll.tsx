"use client";

import { useContent } from "@marketing/hooks/use-content";
import { m, useScroll, useTransform } from "motion/react";
import React, { useEffect, useState } from "react";

export function StoryScroll() {
	const content = useContent();
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<section className="relative py-20 bg-gradient-to-b from-black to-slate-900 overflow-hidden">
			<div className="max-w-4xl mx-auto px-4">
				{content.story.chapters.map((chapter) => (
					<ChapterSection
						key={chapter.id}
						chapter={chapter}
						isMounted={isMounted}
					/>
				))}
			</div>
		</section>
	);
}

interface Chapter {
	id: string;
	title: string;
	content: string;
	emotion: string;
	visual: string;
	metric?: {
		value: number;
		label: string;
	};
	stat?: string;
}

interface ChapterSectionProps {
	chapter: Chapter;
	isMounted: boolean;
}

function ChapterSection({ chapter, isMounted }: ChapterSectionProps) {
	const ref = React.useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start 0.9", "start 0.1"],
	});

	const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
	const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

	// Use static values during SSR, scroll transforms after mount
	const styleProps = isMounted ? { opacity, y } : { opacity: 1, y: 0 };

	const getEmotionColor = (emotion: string) => {
		switch (emotion) {
			case "panic":
				return "text-red-400";
			case "understanding":
				return "text-yellow-400";
			case "relief":
				return "text-green-400";
			default:
				return "text-gray-400";
		}
	};

	const getVisualElement = (visual: string) => {
		switch (visual) {
			case "code-destruction":
				return (
					<m.div
						initial={isMounted ? { scale: 1 } : { scale: 1 }}
						animate={{ scale: [1, 0.8, 1.2, 0] }}
						transition={{
							duration: 2,
							repeat: Number.POSITIVE_INFINITY,
							repeatDelay: 3,
						}}
						className="text-6xl"
					>
						💥
					</m.div>
				);
			case "ai-patterns":
				return (
					<m.div
						className="flex space-x-4"
						animate={{ rotate: [0, 360] }}
						transition={{
							duration: 10,
							repeat: Number.POSITIVE_INFINITY,
							ease: "linear",
						}}
					>
						<div className="text-3xl">🤖</div>
						<div className="text-3xl">🤖</div>
						<div className="text-3xl">🤖</div>
					</m.div>
				);
			case "timeline-restore":
				return (
					<m.div
						className="relative"
						animate={{ x: [-30, 30] }}
						transition={{
							duration: 2,
							repeat: Number.POSITIVE_INFINITY,
							repeatType: "mirror",
							ease: "easeInOut",
						}}
					>
						<div className="text-6xl">⏮️</div>
					</m.div>
				);
			default:
				return null;
		}
	};

	return (
		<m.div
			ref={ref}
			style={styleProps}
			className="min-h-[80vh] flex items-center justify-center py-16 mb-20"
		>
			<div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-gray-700">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
					<div>
						<m.h3
							initial={
								isMounted ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }
							}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							className={`text-2xl md:text-3xl font-bold mb-4 ${getEmotionColor(
								chapter.emotion,
							)}`}
						>
							{chapter.title}
						</m.h3>

						<m.p
							initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.2 }}
							className="text-lg text-gray-300 leading-relaxed mb-6"
						>
							{chapter.content}
						</m.p>

						{chapter.metric && (
							<m.div
								initial={isMounted ? { scale: 0 } : { scale: 1 }}
								whileInView={{ scale: 1 }}
								viewport={{ once: true }}
								transition={{ delay: 0.4, type: "spring" }}
								className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
							>
								<div className="text-3xl font-bold text-red-400">
									${chapter.metric.value.toLocaleString()}
								</div>
								<div className="text-sm text-gray-400 uppercase tracking-wide">
									{chapter.metric.label}
								</div>
							</m.div>
						)}

						{chapter.stat && (
							<m.div
								initial={isMounted ? { scale: 0 } : { scale: 1 }}
								whileInView={{ scale: 1 }}
								viewport={{ once: true }}
								transition={{ delay: 0.4, type: "spring" }}
								className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4"
							>
								<div className="text-lg font-semibold text-yellow-400">
									{chapter.stat}
								</div>
							</m.div>
						)}
					</div>

					<div className="flex justify-center items-center">
						<m.div
							initial={
								isMounted
									? { opacity: 0, scale: 0.5 }
									: { opacity: 1, scale: 1 }
							}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ delay: 0.6 }}
						>
							{getVisualElement(chapter.visual)}
						</m.div>
					</div>
				</div>
			</div>
		</m.div>
	);
}
