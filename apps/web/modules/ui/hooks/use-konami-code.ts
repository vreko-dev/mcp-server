"use client";

import { useEffect, useState } from "react";

const KONAMI_CODE = [
	"ArrowUp",
	"ArrowUp",
	"ArrowDown",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ArrowLeft",
	"ArrowRight",
	"b",
	"a",
];

export function useKonamiCode(callback: () => void) {
	const [_keys, setKeys] = useState<string[]>([]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			setKeys((prevKeys) => {
				const newKeys = [...prevKeys, event.key].slice(-KONAMI_CODE.length);

				if (newKeys.join(",") === KONAMI_CODE.join(",")) {
					callback();
					return [];
				}

				return newKeys;
			});
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [callback]);
}
