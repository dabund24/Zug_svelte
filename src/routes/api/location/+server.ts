import type { RequestHandler } from "@sveltejs/kit";
import { client } from "$lib/server/setup";
import { getSuccessResponse, getZugErrorFromHafasError } from "$lib/server/responses";
import { parseStationStopLocation } from "$lib/server/parse";
import type { Location } from "hafas-client";

export const GET: RequestHandler = async ({ url }) => {
	const param = JSON.parse(url.searchParams.get("id") ?? "") as string | Location;
	if (typeof param !== "string") {
		return new Response(JSON.stringify(getSuccessResponse(parseStationStopLocation(param))));
	}
	const result = await client
		.stop(param, {})
		.then((location) => getSuccessResponse(parseStationStopLocation(location)))
		.catch(getZugErrorFromHafasError);
	return new Response(JSON.stringify(result));
};
