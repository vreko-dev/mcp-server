"use client";
import { m } from "motion/react";
import Image from "next/image";

export const ParallaxScroll = ({
	images,
	className,
}: {
	images: string[];
	className?: string;
}) => {
	const firstRow = images.slice(0, Math.ceil(images.length / 3));
	const secondRow = images.slice(
		Math.ceil(images.length / 3),
		Math.ceil((2 * images.length) / 3),
	);
	const thirdRow = images.slice(Math.ceil((2 * images.length) / 3));

	return (
		<div className={`relative w-full overflow-hidden ${className}`}>
			<div className="flex gap-10 md:gap-20">
				<m.div
					className="flex flex-col gap-10 md:gap-20"
					animate={{ y: [-20, 20] }}
					transition={{
						duration: 20,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "reverse",
						ease: "linear",
					}}
				>
					{firstRow.map((image, idx) => (
						<div key={idx} className="h-20 w-40 overflow-hidden rounded-lg">
							<Image
								src={image}
								alt={`Partner company logo ${idx + 1}`}
								width={160}
								height={80}
								className="h-full w-full object-contain filter grayscale opacity-60 hover:opacity-100 transition-all duration-300"
								loading="lazy"
							/>
						</div>
					))}
				</m.div>
				<m.div
					className="flex flex-col gap-10 md:gap-20"
					animate={{ y: [20, -20] }}
					transition={{
						duration: 20,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "reverse",
						ease: "linear",
					}}
				>
					{secondRow.map((image, idx) => (
						<div key={idx} className="h-20 w-40 overflow-hidden rounded-lg">
							<Image
								src={image}
								alt={`Partner company logo ${idx + firstRow.length + 1}`}
								width={160}
								height={80}
								className="h-full w-full object-contain filter grayscale opacity-60 hover:opacity-100 transition-all duration-300"
								loading="lazy"
							/>
						</div>
					))}
				</m.div>
				<m.div
					className="flex flex-col gap-10 md:gap-20"
					animate={{ y: [-20, 20] }}
					transition={{
						duration: 20,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "reverse",
						ease: "linear",
					}}
				>
					{thirdRow.map((image, idx) => (
						<div key={idx} className="h-20 w-40 overflow-hidden rounded-lg">
							<Image
								src={image}
								alt={`Partner company logo ${
									idx + firstRow.length + secondRow.length + 1
								}`}
								width={160}
								height={80}
								className="h-full w-full object-contain filter grayscale opacity-60 hover:opacity-100 transition-all duration-300"
								loading="lazy"
							/>
						</div>
					))}
				</m.div>
			</div>
		</div>
	);
};
