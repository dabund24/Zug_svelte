import { derived, get, writable } from "svelte/store";
import type {
	AdhesiveBlock,
	JourneyBlock,
	KeyedItem,
	ParsedTime,
	TransitType,
	TreeNode
} from "$lib/types";
import { getApiData, getFirstAndLastTime, getRawLocationBlock } from "$lib/util";
import { getMergingBlock } from "$lib/merge";
import { getApiRefreshUrl, getApiJourneysUrl, getDiagramUrl } from "$lib/urls";
import type { Settings } from "$lib/stores/settingStore";
import { goto } from "$app/navigation";
import type { ParsedLocation } from "$lib/models/ParsedLocation";

export type DisplayedFormData = {
	locations: KeyedItem<ParsedLocation, number>[];
	time: Date;
	timeRole: TransitType;
	options: Settings["journeysOptions"];
	geolocationDate: Date;
};

export type SelectedJourney = {
	blocks: JourneyBlock[];
	selectedBy: number;
	refreshToken: string;
	arrival: ParsedTime;
	departure: ParsedTime;
};

export const displayedFormData = writable<DisplayedFormData | undefined>(undefined);
let locations: ParsedLocation[] = [];
displayedFormData.subscribe((formData) => {
	if (formData === undefined) {
		locations = [];
		return;
	}
	locations = formData.locations.map((keyedLocation) => keyedLocation.value);
});

// this is reset to an empty array when displayedLocations changes
export const mergingBlocks = writable<AdhesiveBlock[]>([]);
displayedFormData.subscribe(resetMergingBlocks);

// this is reset to an empty array when displayedLocations changes
export const selectedJourneys = writable<SelectedJourney[]>([]);
displayedFormData.subscribe(resetSelectedJourneys);

export const displayedJourneys = derived(
	[mergingBlocks, selectedJourneys],
	calculateDisplayedJourneys
);

// this is recalculated when and only when displayedLocations changes
// export const displayedTree = derived(displayedLocations, calculateTree);
export const displayedTree = writable<Promise<TreeNode[]>>(Promise.resolve([]));
displayedFormData.subscribe((formData) => displayedTree.set(calculateTree(formData)));

export function setDisplayedFormData(formData: DisplayedFormData): void {
	displayedFormData.set(formData);
}
export function addDisplayedLocation(location: ParsedLocation, index: number): void {
	displayedFormData.update((formData) => {
		if (formData === undefined) {
			return undefined;
		}
		const newFormData: DisplayedFormData = {
			locations: [
				...formData.locations.slice(0, index),
				{ value: location, key: Math.random() },
				...formData.locations.slice(index)
			],
			time: formData.time,
			timeRole: formData.timeRole,
			options: formData.options,
			geolocationDate: formData.geolocationDate
		};
		void goto(getDiagramUrl(newFormData), { state: { showFilterModal: false } });
		return newFormData;
	});
}
export function removeDisplayedLocation(index: number): void {
	displayedFormData.update((formData) => {
		if (formData === undefined) {
			return undefined;
		}
		const newFormData: DisplayedFormData = {
			locations: [
				...formData.locations.slice(0, index),
				...formData.locations.slice(index + 1)
			],
			time: formData.time,
			timeRole: formData.timeRole,
			options: formData.options,
			geolocationDate: formData.geolocationDate
		};
		void goto(getDiagramUrl(newFormData), { state: { showFilterModal: false } });
		return newFormData;
	});
}

function resetSelectedJourneys(formData: DisplayedFormData | undefined): void {
	if (formData === undefined) {
		selectedJourneys.set([]);
		return;
	}
	selectedJourneys.set(
		Array.from({ length: formData.locations.length - 1 }, (_v, i) => {
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

function resetMergingBlocks(formData: DisplayedFormData | undefined): void {
	if (formData === undefined) {
		mergingBlocks.set([]);
		return;
	}
	mergingBlocks.set(
		Array.from({ length: formData.locations.length ?? 0 }, (_v, i) =>
			getRawLocationBlock(formData.locations[i].value)
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

async function calculateTree(formData: DisplayedFormData | undefined): Promise<TreeNode[]> {
	if (formData === undefined || formData.locations.length < 2) {
		return Promise.resolve([]);
	}
	const url = getApiJourneysUrl(formData);
	const loadingEst = formData.locations.length * 3;
	return getApiData<TreeNode[]>(url, loadingEst).then((response) => {
		console.log(response);
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

export async function refreshJourney(): Promise<void> {
	let idsInDepth: number[];
	const tokens = get(selectedJourneys).map((journey) =>
		journey.refreshToken.length > 5 ? journey.refreshToken : null
	);
	const url = getApiRefreshUrl(tokens);
	const response = await getApiData<JourneyBlock[][]>(url, 3);
	if (response.isError) {
		return;
	}
	const refreshedJourneys = response.content;

	selectedJourneys.update((selectedJourneys) => {
		idsInDepth = selectedJourneys.map((journey) => journey.selectedBy);
		for (let i = 0; i < selectedJourneys.length; i++) {
			selectedJourneys[i].blocks = refreshedJourneys[i];
		}
		return selectedJourneys;
	});
	displayedTree.update(async (tree) => {
		return replaceJourneysInTree(await tree, refreshedJourneys, idsInDepth);
	});
}

/**
 * traverses current journey tree and replaces passed journeys in tree
 * @param tree journey tree where journeys should be replaced
 * @param journeys new journeys, journey at index i lands in depth i
 * @param idsInDepth id at index i stands for id in depth i
 */
function replaceJourneysInTree(
	tree: TreeNode[],
	journeys: JourneyBlock[][],
	idsInDepth: number[]
): TreeNode[] {
	for (const node of tree) {
		if (node.type === "journeyNode" && node.idInDepth === idsInDepth[0]) {
			node.blocks = journeys[0];
			const firstAndLastTime = getFirstAndLastTime(journeys[0]);
			node.arrival = firstAndLastTime.arrival;
			node.departure = firstAndLastTime.departure;
		}
		node.children = replaceJourneysInTree(
			node.children,
			journeys.slice(1),
			idsInDepth.slice(1)
		);
	}
	return tree;
}
