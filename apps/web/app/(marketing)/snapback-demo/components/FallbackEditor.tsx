"use client";

import type React from "react";
import { useEffect, useRef } from "react";

interface FallbackEditorProps {
	value: string;
	onChange: (value: string) => void;
	onMount?: (editor: any) => void;
	language?: string;
	options?: any;
}

export function FallbackEditor({ value, onChange, onMount, language = "typescript" }: FallbackEditorProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (onMount && textareaRef.current) {
			onMount({
				getValue: () => value,
				setValue: (newValue: string) => onChange(newValue),
				addCommand: () => {}, // No-op
			});
		}
	}, [onMount, value, onChange]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e.target.value);
	};

	return (
		<div className="h-full flex flex-col bg-[#1e1e1e] text-gray-200 border border-[#333] rounded">
			<div className="bg-[#2d2d2d] px-4 py-2 text-sm font-mono border-b border-[#333]">
				{language.toUpperCase()} (Fallback)
			</div>
			<textarea
				ref={textareaRef}
				value={value}
				onChange={handleChange}
				className="flex-1 font-mono text-sm p-4 resize-none focus:outline-none bg-[#1e1e1e] text-gray-100"
				style={{
					fontFamily:
						'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
				}}
				spellCheck={false}
			/>
		</div>
	);
}
