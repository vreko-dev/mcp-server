import type { Metadata } from "next";
import RoadmapClient from "./client";

export const metadata: Metadata = {
	title: "Roadmap | SnapBack",
	description: "Our plan to bring developer safety to every AI workflow.",
};

export default function RoadmapPage() {
	return <RoadmapClient />;
}
