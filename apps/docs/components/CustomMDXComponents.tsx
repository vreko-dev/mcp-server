import { DataCollectionTable } from "./docs/data-collection-table";
import { SaveCard } from "./docs/save-card";
import { ShowFor } from "./docs/show-for";
import { TierBadge } from "./docs/tier-badge";
import { TierCard } from "./docs/tier-card";
import { CopyButton, ExpandableSection, StatusBadge } from "./MicroInteractions";

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
	DataCollectionTable,
	ExpandableSection,
	SaveCard,
	ShowFor,
	StatusBadge,
	TierBadge,
	TierCard,
	alert: Alert,
	alertError: AlertError,
	alertInfo: AlertInfo,
	alertWarning: AlertWarning,
	callout: Callout,
	card: Card,
	pre: PreWithCopy,
};
