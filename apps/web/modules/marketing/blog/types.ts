export interface Post {
	path: string;
	locale: string;
	title: string;
	date: string;
	image?: string;
	authorName?: string;
	authorImage?: string;
	excerpt?: string;
	tags?: string[];
	published: boolean;
	body: string;
}
