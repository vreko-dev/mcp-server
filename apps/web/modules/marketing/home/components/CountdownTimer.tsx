"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
	endDate: string; // Format: "YYYY-MM-DD"
}

export function CountdownTimer({ endDate }: CountdownTimerProps) {
	const [timeLeft, setTimeLeft] = useState({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});

	useEffect(() => {
		const calculateTimeLeft = () => {
			const difference = new Date(endDate).getTime() - Date.now();

			if (difference > 0) {
				return {
					days: Math.floor(difference / (1000 * 60 * 60 * 24)),
					hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
					minutes: Math.floor((difference / 1000 / 60) % 60),
					seconds: Math.floor((difference / 1000) % 60),
				};
			}

			return { days: 0, hours: 0, minutes: 0, seconds: 0 };
		};

		setTimeLeft(calculateTimeLeft());

		const timer = setInterval(() => {
			setTimeLeft(calculateTimeLeft());
		}, 1000);

		return () => clearInterval(timer);
	}, [endDate]);

	return (
		<div className="flex items-center gap-1">
			<span className="font-mono">{timeLeft.days}d</span>
			<span className="font-mono">{timeLeft.hours}h</span>
			<span className="font-mono">{timeLeft.minutes}m</span>
			<span className="font-mono">{timeLeft.seconds}s</span>
		</div>
	);
}
