import type React from "react";

export const StickyScrollReveal = ({
	content,
}: {
	content: {
		title: string;
		description: string;
		content?: React.ReactNode;
	}[];
}) => {
	return (
		<div>
			{content.map((item, index) => (
				<div key={index}>
					<h3>{item.title}</h3>
					<p>{item.description}</p>
					{item.content}
				</div>
			))}
		</div>
	);
};
