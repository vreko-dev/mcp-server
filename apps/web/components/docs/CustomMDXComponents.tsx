import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CopyButton, ExpandableSection, StatusBadge } from "@/components/docs/MicroInteractions";

// Enhanced code block with copy functionality
function PreWithCopy(props: ComponentPropsWithoutRef<"pre"> & { children?: ReactNode }) {
	const { children, ...rest } = props;
	const codeString = (children as { props?: { children?: string } })?.props?.children || "";

	return (
		<pre {...rest} className="relative">
			<CopyButton code={codeString} />
			{children}
		</pre>
	);
}

// Custom card component
function Card(props: ComponentPropsWithoutRef<"div">) {
	const { className, ...rest } = props;
	return <div {...rest} className={`card ${className || ""}`} />;
}

// Custom callout component
function Callout(props: ComponentPropsWithoutRef<"div">) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout ${className || ""}`} />;
}

// Custom alert variants
function Alert(props: ComponentPropsWithoutRef<"div">) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout ${className || ""}`} />;
}

function AlertInfo(props: ComponentPropsWithoutRef<"div">) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout alert-info ${className || ""}`} />;
}

function AlertWarning(props: ComponentPropsWithoutRef<"div">) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout alert-warning ${className || ""}`} />;
}

function AlertError(props: ComponentPropsWithoutRef<"div">) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout alert-error ${className || ""}`} />;
}

export const CustomMDXComponents = {
	CopyButton,
	ExpandableSection,
	StatusBadge,
	pre: PreWithCopy,
	card: Card,
	callout: Callout,
	alert: Alert,
	alertInfo: AlertInfo,
	alertWarning: AlertWarning,
	alertError: AlertError,
};
