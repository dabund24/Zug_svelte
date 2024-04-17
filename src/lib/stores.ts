import { derived, writable } from "svelte/store";
import type {
	AdhesiveBlock,
	JourneyBlock,
	JourneyNode,
	KeyedItem,
	ParsedLocation,
	ParsedTime
} from "$lib/types";
import { getApiData, getRawLocationBlock, getTreeUrl } from "$lib/util";
import { browser } from "$app/environment";
import { getMergingBlock } from "$lib/merge";

export type DisplayedLocations = {
	locations: KeyedItem<ParsedLocation, number>[];
	time: Date;
	timeRole: "departure";
};

export type SelectedJourney = {
	blocks: JourneyBlock[];
	selectedBy: number;
	refreshToken: string;
	arrival: ParsedTime;
	departure: ParsedTime;
};

export const displayedLocations = writable<DisplayedLocations>({
	locations: [],
	time: new Date(0),
	timeRole: "departure"
});
let locations: ParsedLocation[] = [];
displayedLocations.subscribe(
	(displayedLocations) =>
		(locations = displayedLocations.locations.map((keyedLocation) => keyedLocation.value))
);

// this is reset to an empty array when displayedLocations changes
export const mergingBlocks = writable<AdhesiveBlock[]>([]);
displayedLocations.subscribe(resetMergingBlocks);

// this is reset to an empty array when displayedLocations changes
export const selectedJourneys = writable<SelectedJourney[]>([]);
displayedLocations.subscribe(resetSelectedJourneys);

export const displayedJourneys = derived(
	[mergingBlocks, selectedJourneys],
	calculateDisplayedJourneys
);

// this is recalculated when and only when displayedLocations changes
// export const displayedTree = derived(displayedLocations, calculateTree);
export const displayedTree = writable<Promise<JourneyNode[]>>(Promise.resolve([]));
displayedLocations.subscribe((dLocations) => displayedTree.set(calculateTree(dLocations)));

export function setDisplayedLocations(
	locations: KeyedItem<ParsedLocation, number>[],
	time: Date,
	timeRole: "departure"
): void {
	displayedLocations.set({ locations, time, timeRole });
}
export function addDisplayedLocation(location: ParsedLocation, index: number): void {
	displayedLocations.update((dLocations) => {
		return {
			locations: [
				...dLocations.locations.slice(0, index),
				{ value: location, key: Math.random() },
				...dLocations.locations.slice(index)
			],
			time: dLocations.time,
			timeRole: dLocations.timeRole
		};
	});
}
export function removeDisplayedLocation(index: number): void {
	displayedLocations.update((locations) => {
		return {
			locations: [
				...locations.locations.slice(0, index),
				...locations.locations.slice(index + 1)
			],
			time: locations.time,
			timeRole: locations.timeRole
		};
	});
}

function resetSelectedJourneys(dLocations: DisplayedLocations): void {
	selectedJourneys.set(
		Array.from({ length: dLocations.locations.length - 1 }, (_v, i) => {
			return {
				blocks: [{ type: "unselected" }],
				selectedBy: -1,
				refreshToken: i.toString(),
				arrival: {},
				departure: {}
			};
		})
	);
}

function resetMergingBlocks(locations: DisplayedLocations): void {
	mergingBlocks.set(
		Array.from({ length: locations.locations.length }, (_v, i) =>
			getRawLocationBlock(locations.locations[i].value)
		)
	);
}

function calculateDisplayedJourneys([merging, selected]: [
	AdhesiveBlock[],
	SelectedJourney[]
]): KeyedItem<JourneyBlock[], string>[] {
	return Array.from({ length: 2 * merging.length - 1 }, (_v, i) => {
		const mergingBlock = merging[i / 2];
		return i % 2 === 0
			? {
					value: merging[i / 2] !== undefined ? [merging[i / 2]] : [],
					key:
						(i >= 2 ? selected[i / 2 - 1].refreshToken : "") +
						(mergingBlock?.type === "location" ? mergingBlock.location.name : "-") +
						(selected.at(i / 2)?.refreshToken ?? "")
				}
			: {
					value: selected[~~(i / 2)].blocks,
					key: selected[~~(i / 2)].refreshToken
				};
	}) as KeyedItem<JourneyBlock[], string>[];
}

async function calculateTree(dLocations: DisplayedLocations): Promise<JourneyNode[]> {
	if (dLocations.locations.length < 2) {
		return Promise.resolve([]);
	}
	const url = getTreeUrl(dLocations);
	return getApiData<JourneyNode[]>(url).then((response) => {
		return response.isError ? [] : response.content;
	});
}

/**
 * updates the selectedJourneys store
 */
export function selectJourneyBlocks(selectedJourney: SelectedJourney, depth: number): void {
	selectedJourneys.update((journeys) => {
		// transition from previous journey
		const previousJourney = depth > 0 ? journeys[depth - 1] : undefined;
		const nextJourney = journeys.at(depth + 1);
		updateMergingBlocks(
			previousJourney,
			selectedJourney.blocks.at(0) ?? { type: "unselected" },
			selectedJourney.blocks.at(-1) ?? { type: "unselected" },
			nextJourney,
			depth
		);

		// selected journey
		journeys[depth] = { ...selectedJourney };
		return journeys;
	});
}

/**
 * updates the selectedJourneys store
 * @param depth depth in tree
 */
export function unselectJourneyBlocks(depth: number): void {
	selectedJourneys.update((journeys) => {
		const previousJourney = depth > 0 ? journeys[depth - 1] : undefined;
		const nextJourney = journeys.at(depth + 1);
		updateMergingBlocks(
			previousJourney,
			{ type: "unselected" },
			{ type: "unselected" },
			nextJourney,
			depth
		);

		journeys[depth] = {
			blocks: [{ type: "unselected" }],
			selectedBy: -1,
			refreshToken: depth.toString(),
			arrival: {},
			departure: {}
		};
		return journeys;
	});
}

function updateMergingBlocks(
	previousJourney: SelectedJourney | undefined,
	startingBlock: JourneyBlock,
	endingBlock: JourneyBlock,
	nextJourney: SelectedJourney | undefined,
	index: number
): void {
	mergingBlocks.update((mergingBlocks) => {
		const mergingBlockPrevious = getMergingBlock(
			previousJourney?.blocks.at(-1) ?? { type: "unselected" },
			locations[index],
			startingBlock
		);
		const mergingBlockNext = getMergingBlock(
			endingBlock,
			locations[index + 1],
			nextJourney?.blocks[0] ?? { type: "unselected" }
		);
		return [
			...mergingBlocks.slice(0, index),
			mergingBlockPrevious,
			mergingBlockNext,
			...mergingBlocks.slice(index + 2)
		];
	});
}

export const L = writable<typeof import("leaflet")>();
if (browser) {
	void import("leaflet").then((importedLeaflet) => {
		const l = importedLeaflet.default;
		L.set(l);
	});
}
