"use client";
import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	shift,
	useDismiss,
	useFloating,
	useFocus,
	useHover,
	useInteractions,
	useRole,
} from "@floating-ui/react";
import { type ReactNode, useId, useState } from "react";

interface AccessibleTooltipProps {
	children: ReactNode;
	content: ReactNode;
	delay?: number;
}

export function AccessibleTooltip({ children, content, delay = 700 }: AccessibleTooltipProps) {
	const [isOpen, setIsOpen] = useState(false);
	const ariaId = useId();

	const { refs, floatingStyles, context } = useFloating({
		open: isOpen,
		onOpenChange: setIsOpen,
		placement: "top",
		middleware: [
			offset(8),
			flip({
				fallbackAxisSideDirection: "start",
			}),
			shift({ padding: 8 }),
		],
		whileElementsMounted: autoUpdate,
	});

	const hover = useHover(context, {
		delay: { open: delay, close: 0 },
		restMs: 25,
	});

	const focus = useFocus(context);
	const dismiss = useDismiss(context);
	const role = useRole(context, { role: "tooltip" });

	const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

	return (
		<>
			<div ref={refs.setReference} {...getReferenceProps()} aria-describedby={isOpen ? ariaId : undefined}>
				{children}
			</div>

			<FloatingPortal>
				{isOpen && (
					<div
						ref={refs.setFloating}
						style={floatingStyles}
						{...getFloatingProps()}
						id={ariaId}
						role="tooltip"
						className="bg-black/90 backdrop-blur-xl text-white text-sm px-3 py-2 rounded-lg border border-white/10 z-50"
					>
						{content}
					</div>
				)}
			</FloatingPortal>
		</>
	);
}
