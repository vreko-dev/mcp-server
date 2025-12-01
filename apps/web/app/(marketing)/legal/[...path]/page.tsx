import { PostContent } from "@marketing/blog/components/PostContent";
import { getActivePathFromUrlParam } from "@shared/lib/content";
import { redirect } from "next/navigation";
import { getAllLegalPages } from "@/lib/legal-loader";

type Params = {
	path: string;
};

export async function generateMetadata(props: { params: Promise<Params> }) {
	const params = await props.params;

	const { path } = params;

	const activePath = getActivePathFromUrlParam(path);
	const allPages = getAllLegalPages();
	const page = allPages
		.filter((doc) => doc.path === activePath)
		.sort((doc) => (doc.locale === "en" ? -1 : 1))[0];

	return {
		title: page?.title,
		openGraph: {
			title: page?.title,
		},
	};
}

export default async function BlogPostPage(props: { params: Promise<Params> }) {
	const params = await props.params;

	const { path } = params;

	const activePath = getActivePathFromUrlParam(path);
	const allPages = getAllLegalPages();
	const page = allPages
		.filter((doc) => doc.path === activePath)
		.sort((doc) => (doc.locale === "en" ? -1 : 1))[0];

	if (!page) {
		redirect("/");
	}

	const { title, body } = page;

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900">
			<div className="container max-w-6xl pt-32 pb-24">
				<div className="mx-auto mb-12 max-w-3xl">
					<h1 className="text-center font-bold text-5xl lg:text-6xl text-white mb-4">
						{title}
					</h1>
				</div>

				<PostContent content={body} />
			</div>
		</div>
	);
}
