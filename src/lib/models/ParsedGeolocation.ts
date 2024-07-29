import { ParsedLocation } from "$lib/models/ParsedLocation";
import type { Leg } from "hafas-client";

export class ParsedGeolocation extends ParsedLocation {
	asAt: Date;

	constructor(position?: ParsedLocation["position"], asAt?: Date) {
		if (position === undefined) {
			super();
		} else {
			super({
				latitude: position?.lat,
				longitude: position?.lng,
				type: "location",
				address: "Standort"
			});
		}
		this.name = "Standort";
		this.type = "currentLocation";
		this.asAt = asAt ?? new Date();
	}

	static createLegCurrentLocation(leg: Leg): ParsedGeolocation | undefined {
		if (leg.currentLocation === undefined) {
			return undefined;
		}
		const currentLocation = new ParsedGeolocation();
		currentLocation.name = `${leg.line?.name} → ${leg.direction}`;
		currentLocation.requestParameter = { type: "location" };
		currentLocation.position = {
			lat: leg.currentLocation.latitude ?? 0,
			lng: leg.currentLocation.longitude ?? 0
		};

		return currentLocation;
	}

	static createUserCurrentLocation(
		currentPosition: ParsedLocation["position"]
	): ParsedGeolocation {
		const currentLocation = new ParsedGeolocation();
		currentLocation.name = "Live-Standort";
		currentLocation.position = currentPosition;
		return currentLocation;
	}

	toRelativeString(): string {
		return `${this.name} ${relativeDate(this.asAt)}`;
	}
}

/**
 * gives a human-readable relative string for a given date from the past relative to now
 * stolen from https://stackoverflow.com/a/53800501
 * @param date the old date
 */
function relativeDate(date: Date): string {
	const diff = Math.round(new Date(date).getTime() - new Date().getTime());
	const units = {
		year: 24 * 60 * 60 * 1000 * 365,
		month: (24 * 60 * 60 * 1000 * 365) / 12,
		day: 24 * 60 * 60 * 1000,
		hour: 60 * 60 * 1000,
		minute: 60 * 1000
	};
	const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });

	let u: keyof typeof units;
	for (u in units)
		if (Math.abs(diff) > units[u]) {
			return rtf.format(Math.round(diff / units[u]), u);
		}
	return "";
}
