import { isDefined } from "$lib/util";

import type { RequestHandler } from "@sveltejs/kit";
import autocomplete from "db-hafas-stations-autocomplete";
import stations from "db-hafas-stations";
import type { ZugResponse } from "$lib/types";
import { getSuccessResponse, getZugErrorFromHafasError } from "$lib/server/responses";
import { client } from "$lib/server/setup";
import { ParsedLocation } from "$lib/models/ParsedLocation";

const stationsNameMap = new Map<string, ParsedLocation>();
const stationsIdMap = new Map<string, ParsedLocation>();

stations
	.full()
	.on("data", (obj) => {
		stationsNameMap.set(obj.name, new ParsedLocation(obj));
	})
	.on("end", () => {
		console.log("Stream has been completely read.");

		stationsNameMap.forEach((location) => {
			const id = location.requestParameter;
			stationsIdMap.set(typeof id === "string" ? id : "", location);
		});

		stationsNameMap.clear();
	});

export const GET: RequestHandler = async ({ url }) => {
	let result: ZugResponse<ParsedLocation[]>;
	if (url.searchParams.get("hafas") === "true") {
		result = await client
			.locations(url.searchParams.get("name") ?? "", { results: 10 })
			.then((locations) =>
				getSuccessResponse(locations.map((location) => new ParsedLocation(location)))
			)
			.catch(getZugErrorFromHafasError);
	} else {
		const locations = autocomplete(url.searchParams.get("name") ?? "", 10, true, true)
			.map((location) => stationsIdMap.get(location.id))
			.filter(isDefined);
		result = getSuccessResponse(locations);
	}

	return new Response(JSON.stringify(result));
};
