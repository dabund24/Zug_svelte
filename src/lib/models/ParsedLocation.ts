import type { Location, Station, Stop } from "hafas-client";
import type { StationFull } from "db-hafas-stations";

export class ParsedLocation {
	name: string = "undefined";
	requestParameter: string | Station | Stop | Location | StationFull = "";
	type: "station" | "address" | "poi" | "currentLocation" = "address";
	position: { lat: number; lng: number } = { lat: 0, lng: 0 };

	constructor(location?: Station | Stop | Location | StationFull) {
		if (location === undefined) {
			return;
		} else if (location.type === "station" || location.type === "stop") {
			this.name = location.name ?? "undefined";
			this.requestParameter = location.id ?? location;
			this.type = "station";
			this.position = {
				lat: location.location?.latitude ?? 0,
				lng: location.location?.longitude ?? 0
			};
		} else if (location.poi) {
			this.name = location.name ?? "undefined";
			this.requestParameter = location;
			this.type = "poi";
			this.position = {
				lat: location.latitude ?? 0,
				lng: location.longitude ?? 0
			};
		} else {
			this.name = location.address ?? "undefined";
			this.requestParameter = location;
			this.type = "address";
			this.position = {
				lat: location.latitude ?? 0,
				lng: location.longitude ?? 0
			};
		}
	}

	toRelativeString(): string {
		return this.name;
	}

	equals(other: ParsedLocation): boolean {
		return this.position.lat === other.position.lat && this.position.lng === other.position.lng;
	}
}
