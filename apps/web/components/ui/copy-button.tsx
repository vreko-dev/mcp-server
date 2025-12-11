"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
	value: string;
	className?: string;
	children?: React.ReactNode;
}

export function CopyButton({ value, className, children }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const onCopy = () => {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button variant="outline" size="sm" className={cn("gap-2", className)} onClick={onCopy}>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
			{children || (copied ? "Copied" : "Copy")}
		</Button>
	);
}
