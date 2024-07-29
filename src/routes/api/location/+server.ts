import type { RequestHandler } from "@sveltejs/kit";
import { client } from "$lib/server/setup";
import { getSuccessResponse, getZugErrorFromHafasError } from "$lib/server/responses";
import type { Location } from "hafas-client";
import { ParsedLocation } from "$lib/models/ParsedLocation";

export const GET: RequestHandler = async ({ url }) => {
	const param = JSON.parse(url.searchParams.get("id") ?? "") as string | Location;
	if (typeof param !== "string") {
		return new Response(JSON.stringify(getSuccessResponse(new ParsedLocation(param))));
	}
	const result = await client
		.stop(param, {})
		.then((location) => getSuccessResponse(new ParsedLocation(location)))
		.catch(getZugErrorFromHafasError);
	return new Response(JSON.stringify(result));
};
