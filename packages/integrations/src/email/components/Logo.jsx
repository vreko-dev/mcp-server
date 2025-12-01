export function Logo({ withLabel = true }) {
	return (
		<span className="flex items-center font-semibold text-primary leading-none">
			<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 375 375">
				<title>SnapBack</title>
				<path
					fill="#fafafa"
					d="M 0.171875 0.261719 L 166.726562 0.261719 L 166.726562 112.761719 L 0.171875 112.761719 Z M 0.171875 0.261719"
					fillOpacity="1"
					fillRule="nonzero"
				/>
			</svg>
		</span>
	);
}
