import Image from "next/image";

export const IconVSCode = ({ className }: { className?: string }) => (
	<div className={`relative ${className}`}>
		<Image
			src="/images/logos/visual-studio-code.svg"
			alt="VS Code"
			fill
			className="object-contain"
		/>
	</div>
);

export const IconCursor = ({ className }: { className?: string }) => (
	<div className={`relative ${className}`}>
		<Image
			src="/images/logos/cursor-logo.svg"
			alt="Cursor"
			fill
			className="object-contain invert"
		/>
	</div>
);
