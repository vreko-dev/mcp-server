// CSS module declaration for global CSS files
declare module "*.css" {
	const content: { [className: string]: string };
	export default content;
}
