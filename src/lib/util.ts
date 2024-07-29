import type {
	Fetchable,
	JourneyBlock,
	DefiningBlock,
	LocationBlock,
	TransitData,
	ZugResponse,
	KeyedItem,
	TransitType,
	ParsedTime
} from "$lib/types";
import { startLoading, stopLoading } from "$lib/stores/loadingStore";
import { ParsedLocation } from "$lib/models/ParsedLocation";
import { ParsedGeolocation } from "$lib/models/ParsedGeolocation";

export function isDefined<T>(arg: T | undefined): arg is T {
	return arg !== undefined;
}

export function valueIsDefined<T, K extends number | string>(
	keyedItem: KeyedItem<T | undefined, K>
): keyedItem is KeyedItem<T, K> {
	return keyedItem.value !== undefined;
}

export async function getApiData<T extends Fetchable>(
	url: URL,
	loadingEst: number | undefined
): Promise<ZugResponse<T>> {
	let loadingId: number | undefined = undefined;
	if (loadingEst !== undefined) {
		loadingId = startLoading(loadingEst);
	}

	const result: ZugResponse<T> = await fetch(url)
		.then((res: Response) => res.json() as Promise<ZugResponse<T>>)
		.catch(() => {
			return {
				isError: true,
				type: "ERROR",
				code: 400,
				station1: undefined,
				station2: undefined
			};
		});

	if (loadingId !== undefined) {
		stopLoading(loadingId, result.isError);
	}
	return result;
}

export function isTimeDefined(block: JourneyBlock): block is DefiningBlock {
	return block.type === "leg" || block.type === "location";
}

export function getFirstAndLastTime(blocks: JourneyBlock[]): { [K in TransitType]: ParsedTime } {
	const departureBlock = blocks.find<DefiningBlock>(isTimeDefined);
	const arrivalBlock = blocks.findLast<DefiningBlock>(isTimeDefined);
	return {
		departure: getTimeFromBlock(departureBlock, "departure"),
		arrival: getTimeFromBlock(arrivalBlock, "arrival")
	};
}

function getTimeFromBlock(block: DefiningBlock | undefined, type: TransitType): ParsedTime {
	if (block?.type === "leg") {
		return block[`${type}Data`].time;
	} else {
		return { [type]: block?.time[type] };
	}
}

export function mergeTransitData(
	transitData1: TransitData,
	transitData2: TransitData,
	singlePlatform?: boolean
): TransitData {
	return {
		location: transitData1.location,
		time: {
			arrival: transitData1.time.arrival,
			departure: transitData2.time.departure
		},
		attribute: transitData1.attribute,
		attribute2: transitData2.attribute,
		platformData: transitData1.platformData,
		platformData2: singlePlatform ? undefined : transitData2.platformData
	};
}

export function getRawLocationBlock(location: ParsedLocation): LocationBlock {
	return {
		type: "location",
		location,
		time: {},
		hidden: false
	};
}

export function timeToString(time: Date | undefined): string {
	if (time === undefined || time === null) {
		return "−−:−−";
	}
	const date = new Date(time);
	return date.toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit"
	});
}

export function dateToInputDate(dateObject: Date): string {
	const timezoneOffset = dateObject.getTimezoneOffset() * 60000;
	const timeIsoString = new Date(dateObject.getTime() - timezoneOffset).toISOString();
	return timeIsoString.substring(0, timeIsoString.indexOf("T") + 6);
}

/**
 * subtract a date from another
 * @param sooner the first date
 * @param later the second date
 * @returns the difference in minutes
 */
export function dateDifference(
	sooner: string | number | Date | undefined,
	later: string | number | Date | undefined
): number | undefined {
	if (sooner === undefined || later === undefined) {
		return undefined;
	}
	const dateA = new Date(sooner).getTime();
	const dateB = new Date(later).getTime();
	const differenceMilliseconds = dateB - dateA;
	return differenceMilliseconds / 60000;
}

export async function getCurrentGeolocation(): Promise<ParsedGeolocation> {
	const loadingId = startLoading(5);
	return new Promise<ParsedGeolocation>((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const currentLocation = new ParsedGeolocation(
					{
						lat: position.coords.latitude,
						lng: position.coords.longitude
					},
					new Date(position.timestamp)
				);
				stopLoading(loadingId, false);
				resolve(currentLocation);
			},
			() => {
				stopLoading(loadingId, true);
				throw new Error();
			}
		);
	});
}
