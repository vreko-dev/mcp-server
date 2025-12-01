"use client";

import { siteSpec } from "@marketing/config/site-config";
import { createContext, type ReactNode, useContext, useState } from "react";

interface DemoContextType {
	selectedSnapshotIndex: number;
	setSelectedSnapshotIndex: (index: number) => void;
	snapshots: string[];
	isRecovered: boolean;
	recover: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
	const { interactive_demo } = siteSpec.pages.home.sections;
	const snapshots = interactive_demo.content.snapshots;
	const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(
		snapshots.length - 1,
	);
	const [isRecovered, setIsRecovered] = useState(false);

	const recover = () => {
		setIsRecovered(true);
		// Simulate recovery delay or animation if needed
		setTimeout(() => setIsRecovered(false), 2000); // Reset for demo purposes
	};

	return (
		<DemoContext.Provider
			value={{
				selectedSnapshotIndex,
				setSelectedSnapshotIndex,
				snapshots,
				isRecovered,
				recover,
			}}
		>
			{children}
		</DemoContext.Provider>
	);
}

export function useDemo() {
	const context = useContext(DemoContext);
	if (context === undefined) {
		throw new Error("useDemo must be used within a DemoProvider");
	}
	return context;
}
