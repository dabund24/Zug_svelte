import type { JourneysOptions, Line, Location, Station, Stop } from "hafas-client";
import type { NumericRange } from "@sveltejs/kit";

export type KeyedItem<T, K extends number | string> = {
	value: T;
	key: K;
};

export type Fetchable = JourneyNode[] | JourneyBlock[] | ParsedLocation[];

export type ZugResponse<T extends Fetchable> = ZugSuccess<T> | ZugError;

export type ZugSuccess<T extends Fetchable> = {
	isError: false;
	content: T;
};

export type ZugError = {
	isError: true;
	code: NumericRange<400, 599>;
	type: ZugErrorType;
	station1?: number;
	station2?: number;
};

export type ZugErrorType =
	| `HAFAS_${HafasError["code"]}`
	| "NO_CONNECTIONS"
	| "MISSING_PROPERTY"
	| "NOT_FOUND"
	| "ERROR";

// see https://github.com/public-transport/hafas-client/blob/336a9ba115d6a7e6b946349376270907f5c0742c/lib/errors.js
export type HafasError = {
	isHafasError: true;
	code: "ACCESS_DENIED" | "INVALID_REQUEST" | "NOT_FOUND" | "SERVER_ERROR";
	isCausedByServer: boolean;
	hafasCode: string;
};

/**
 * each time displayed in this app is either representing departure or arrival.
 * Usually, both are shown vertically next to each other.
 * This type represents such a time pair and can be used universally
 */
export type ParsedTime = {
	arrival?: {
		time: Date;
		color?: "red" | "green";
		delay?: number;
	} | null;
	departure?: {
		time: Date;
		color?: "red" | "green";
		delay?: number;
	} | null;
};

export type ParsedLocation = {
	name: string;
	requestParameter: string | Station | Stop | Location;
	type: "station" | "address" | "poi";
	position: { lat: number; lng: number };
};

/**
 * This type is used whenever a journey comes in touch with a station.
 * In particular, it is used in [transfer blocks]{@linkcode TransferBlock} and for stopovers in [leg blocks]{@linkcode LegBlock}
 */
export type TransitData = {
	location: ParsedLocation;
	attribute?: "cancelled" | "additional";
	attribute2?: "cancelled" | "additional";
	time: ParsedTime;
	platformData: {
		platform: string;
		platformChanged: boolean;
	} | null;
	platformData2?: {
		platform: string;
		platformChanged: boolean;
	} | null;
};

export type JourneyNode = {
	depth: number;
	idInDepth: number;
	refreshToken: string;
	blocks: JourneyBlock[];
	arrival: ParsedTime;
	departure: ParsedTime;
	children: JourneyNode[];
};

export type JourneyBlock =
	| LegBlock
	| WalkingBlock
	| TransferBlock
	| LocationBlock
	| ErrorBlock
	| UnselectedBlock;

/**
 * Every block with an even index in a journey is such a block. (*Exception*: unselected journeys!
 * Those consist of one {@linkcode UnselectedBlock})
 *
 * Because users select journeys only based on those blocks, they define the way a journey looks like.
 * Important characteristics:
 * - Selected journeys start and end with a defining block.
 * - Every defining block has a departure time and arrival time
 */
export type DefiningBlock = LegBlock | LocationBlock;

/**
 * Every block with an odd index in a journey is such a block. (*Exception*: unselected journeys! Those consist of one {@linkcode UnselectedBlock})
 *
 * What they look like for a journey depends directly on the preceding and succeeding {@linkcode DefiningBlock}.
 */
export type FillerBlock = Exclude<JourneyBlock, DefiningBlock>;

/**
 * When merging two journeys all possibilities are covered by this type.
 * Check out the function {@linkcode getMergingBlock} in `$lib/merge.ts` for all merging possibilities
 */
export type AdhesiveBlock = LocationBlock | WalkingBlock | TransferBlock | undefined;

export type LegBlock = {
	type: "leg";
	tripId: string;
	blockKey: string;
	departureData: TransitData;
	arrivalData: TransitData;
	duration: number;
	direction: string;
	line: Line;
	stopovers: TransitData[];
	polyline: [number, number][];
	precededByTransferBlock: boolean;
	succeededByTransferBlock: boolean;
};

export type WalkingBlock = {
	type: "walk";
	originLocation: ParsedLocation;
	destinationLocation: ParsedLocation;
	transferTime: number;
	walkingTime?: number;
	distance: number;
};

export type TransferBlock = {
	type: "transfer";
	transferTime: number;
	transitData: TransitData;
	arrivalProduct: string;
	departureProduct: string;
};

export type LocationBlock = {
	type: "location";
	time: ParsedTime;
	location: ParsedLocation;
	hidden: boolean;
};

export type ErrorBlock = {
	type: "error";
};

export type UnselectedBlock = {
	type: "unselected";
};

export type PopupData = PopupDataStation | PopupDataLine | PopupDataWalk;

export type PopupDataWalk = {
	type: "walk";
	duration: number;
	walkingTime?: number;
	distance?: number;
};

export type PopupDataLine = {
	type: "line";
	duration: number;
	direction: string;
	line: Line;
};

export type PopupDataStation = {
	type: "station";
	transitData: TransitData;
	product1?: string;
	product2?: string;
};

export const products = {
	nationalExpress: "Intercity-Express",
	national: "Intercity/Eurocity",
	regionalExpress: "sonst. Fernzug",
	regional: "Regionalexpress/-bahn",
	suburban: "S-Bahn",
	subway: "U-Bahn",
	tram: "Straßenbahn",
	bus: "Bus",
	ferry: "Fähre",
	taxi: "Ruftaxi"
} as const;
export type Product = keyof typeof products;

/**
 * fie
 */
export type JourneysSettings = JourneysOptions & {
	accessibility: "none" | "partial" | "complete";
	bike: boolean;
	products: {
		[product in Product]: boolean;
	};
	transfers: -1 | 0 | 1 | 2 | 3 | 4 | 5;
	transferTime: number;
};
