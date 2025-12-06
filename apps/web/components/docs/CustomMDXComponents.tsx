import { CopyButton, ExpandableSection, StatusBadge } from "@/components/docs/MicroInteractions";

// Enhanced code block with copy functionality
function PreWithCopy(props: any) {
	const { children, ...rest } = props;
	const codeString = children?.props?.children || "";

	return (
		<pre {...rest} className="relative">
			<CopyButton code={codeString} />
			{children}
		</pre>
	);
}

// Custom card component
function Card(props: any) {
	const { className, ...rest } = props;
	return <div {...rest} className={`card ${className || ""}`} />;
}

// Custom callout component
function Callout(props: any) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout ${className || ""}`} />;
}

// Custom alert variants
function Alert(props: any) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout ${className || ""}`} />;
}

function AlertInfo(props: any) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout alert-info ${className || ""}`} />;
}

function AlertWarning(props: any) {
	const { className, ...rest } = props;
	return <div {...rest} className={`callout alert-warning ${className || ""}`} />;
}

function AlertError(props: any) {
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
