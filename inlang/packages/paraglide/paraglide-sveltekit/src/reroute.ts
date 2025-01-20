import type { Reroute } from "@sveltejs/kit";

export const reroute: Reroute = (request) => {
	return stripLocaleFromPath(request.url.pathname);
};

function stripLocaleFromPath(path: string) {
	return path.replace(/^\/[a-z]{2}\//, "/");
}
