"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Fragment } from "react";
import type { BreadcrumbItem } from "@/lib/source-types";

export function Breadcrumbs({
	items = [],
}: {
	items?: BreadcrumbItem[];
}): React.ReactElement {
	return (
		<nav className="flex items-center gap-1 text-sm text-muted-foreground">
			<Link href="/docs" className="font-medium">
				Docs
			</Link>
			{items.map((item, index) => (
				<Fragment key={item.url}>
					<ChevronRightIcon className="size-4" />
					{index === items.length - 1 ? (
						<span className="font-medium text-foreground">{item.title}</span>
					) : (
						<Link href={item.url} className="font-medium">
							{item.title}
						</Link>
					)}
				</Fragment>
			))}
		</nav>
	);
}
