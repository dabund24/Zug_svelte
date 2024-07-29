<script lang="ts">
	import StationInput from "./StationInput.svelte";
	import { type KeyedItem, type TransitType } from "$lib/types.js";
	import { dateToInputDate, getCurrentGeolocation, valueIsDefined } from "$lib/util.js";
	import { type DisplayedFormData, setDisplayedFormData } from "$lib/stores/journeyStores.js";
	import { scale } from "svelte/transition";
	import { flip } from "svelte/animate";
	import Modal from "$lib/components/Modal.svelte";
	import Tabs from "$lib/components/Tabs.svelte";
	import Setting from "$lib/components/Setting.svelte";
	import { products, settings } from "$lib/stores/settingStore";
	import IconFilter from "$lib/components/icons/IconFilter.svelte";
	import IconSearch from "$lib/components/icons/IconSearch.svelte";
	import { goto, pushState } from "$app/navigation";
	import { page } from "$app/stores";
	import SingleSelect from "$lib/components/SingleSelect.svelte";
	import { getDiagramUrl } from "$lib/urls";
	import { get } from "svelte/store";
	import type { ParsedLocation } from "$lib/models/ParsedLocation";
	import { ParsedGeolocation } from "$lib/models/ParsedGeolocation";

	export let initialFormData: DisplayedFormData | undefined = undefined;

	let stops: KeyedItem<ParsedLocation | undefined, number>[];

	$: if (initialFormData === undefined) {
		stops = [
			{ value: undefined, key: Math.random() },
			{ value: undefined, key: Math.random() }
		];
	} else {
		stops = initialFormData.locations;
	}

	let departureArrivalSelection: 0 | 1;
	let timeIsNow: boolean;
	let time: string;

	$: initTimeInputs(initialFormData);

	function initTimeInputs(displayedFormData: DisplayedFormData | undefined): void {
		if (displayedFormData === undefined) {
			departureArrivalSelection = 0;
			timeIsNow = true;
			time = dateToInputDate(new Date());
			return;
		}

		departureArrivalSelection = displayedFormData.timeRole === "arrival" ? 1 : 0;
		timeIsNow =
			~~(new Date().getTime() / 60000) === ~~(displayedFormData.time.getTime() / 60000);
		time = dateToInputDate(displayedFormData.time);
	}

	function removeVia(index: number): void {
		stops = [...stops.slice(0, index), ...stops.slice(index + 1, stops.length)];
	}
	function addVia(index: number): void {
		stops = [
			...stops.slice(0, index),
			{ value: undefined, key: Math.random() },
			...stops.slice(index, stops.length)
		];
	}
	function reverseStops(): void {
		stops = stops.toReversed();
	}

	async function handleFormSubmit(): Promise<void> {
		const stopsToBeDisplayed = stops.filter<KeyedItem<ParsedLocation, number>>(
			valueIsDefined<ParsedLocation, number>
		);
		if (stopsToBeDisplayed.length < 2) {
			return;
		}
		const journeyTime = timeIsNow ? new Date() : new Date(time);
		const timeRole: TransitType = departureArrivalSelection === 0 ? "departure" : "arrival";
		const options = get(settings).journeysOptions;
		const formData: DisplayedFormData = {
			locations: stopsToBeDisplayed,
			time: journeyTime,
			timeRole,
			options,
			geolocationDate: new Date()
		};
		// handle current position
		if (formData.locations.some((l) => l.value instanceof ParsedGeolocation)) {
			const currentLocation = await getCurrentGeolocation();
			formData.geolocationDate = currentLocation.asAt;
			formData.locations = formData.locations.map((l) => {
				if (l.value instanceof ParsedGeolocation) {
					return { key: l.key, value: currentLocation };
				}
				return l;
			});
		}

		setDisplayedFormData(formData);

		void goto(getDiagramUrl(formData));
	}

	function showFilterModal(): void {
		pushState("", {
			showFilterModal: true
		});
	}
</script>

<form class="flex-column" on:submit|preventDefault={handleFormSubmit}>
	<div class="location-inputs--outer flex-row">
		<div class="location-inputs">
			{#each stops as stop, i (stop.key)}
				<div
					class="flex-row input-container"
					transition:scale
					on:introstart={(e) =>
						void (
							e.target instanceof Element &&
							e.target.classList.add("input-container--transitioning")
						)}
					on:introend={(e) =>
						void (
							e.target instanceof Element &&
							e.target.classList.remove("input-container--transitioning")
						)}
					on:outrostart={(e) =>
						void (
							e.target instanceof Element &&
							e.target.classList.add("input-container--transitioning")
						)}
					animate:flip={{ duration: 400 }}
				>
					<button
						class="button--small add-button hoverable"
						type="button"
						on:click={() => void addVia(i)}
						title="Station hinzufügen"
					>
						<svg width="16px" height="16px">
							<g
								stroke="var(--foreground-color)"
								stroke-width="3"
								stroke-linecap="round"
							>
								<line x1="8" y1="2" x2="8" y2="14" />
								<line x1="2" y1="8" x2="14" y2="8" />
							</g>
						</svg>
					</button>
					<StationInput
						bind:selectedLocation={stop.value}
						inputPlaceholder={i === 0
							? "Start"
							: i < stops.length - 1
								? "Zwischenstation"
								: "Ziel"}
					/>
					<button
						class="button--small remove-button hoverable"
						type="button"
						on:click={() => void removeVia(i)}
						title="Station entfernen"
					>
						<svg width="16px" height="16px">
							<g
								stroke="var(--foreground-color)"
								stroke-width="3"
								stroke-linecap="round"
							>
								<line x1="3" y1="3" x2="13" y2="13" />
								<line x1="3" y1="13" x2="13" y2="3" />
							</g>
						</svg>
					</button>
				</div>
			{/each}
		</div>
		<button
			class="button--small hoverable"
			type="button"
			on:click={reverseStops}
			title="Stationsreihenfolge tauschen"
		>
			<svg width="16px" height="16px">
				<g
					stroke="var(--foreground-color)"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
				>
					<polyline points="5.5,2 5.5,14 1.5,10" />
					<polyline points="10.5,14 10.5,2 14.5,6" />
				</g>
			</svg>
		</button>
	</div>
	<div class="time-filter-submit" class:time-is-now={timeIsNow}>
		<div class="flex-row">
			<SingleSelect
				names={["Abfahrt", "Ankunft"]}
				bind:selected={departureArrivalSelection}
			/>
			<Setting
				settingName="jetzt"
				bind:setting={timeIsNow}
				settingInfo={{ type: "boolean" }}
			/>
		</div>
		<div class="time-input-container">
			{#if timeIsNow !== undefined && !timeIsNow}
				<input transition:scale class="hoverable" type="datetime-local" bind:value={time} />
			{/if}
		</div>
		<div class="filter-submit">
			<button
				class="hoverable padded-top-bottom button--small"
				on:click={showFilterModal}
				type="button"
				title="Verbindungen filtern"
			>
				<IconFilter />
			</button>
			{#if $page.state.showFilterModal}
				<Modal title="Filter" height={"32rem"} bind:showModal={$page.state.showFilterModal}>
					<Tabs tabs={["Allgemein", "Verkehrsmittel"]} let:activeTab>
						{#if activeTab === 0}
							<div class="settings">
								<Setting
									settingName="Fahrradmitnahme"
									bind:setting={$settings.journeysOptions.bike}
									settingInfo={{ type: "boolean" }}
								/>
								<Setting
									settingName="Barrierefreiheit"
									bind:setting={$settings.journeysOptions.accessibility}
									settingInfo={{
										type: "options",
										options: [
											{ value: "none", name: "ignorieren" },
											{ value: "partial", name: "bevorzugen" },
											{ value: "complete", name: "strikt" }
										]
									}}
								/>
								<Setting
									settingName="Maximale Umstiegsanzahl"
									bind:setting={$settings.journeysOptions.transfers}
									settingInfo={{
										type: "options",
										options: [
											{ value: 0, name: "0" },
											{ value: 1, name: "1" },
											{ value: 2, name: "2" },
											{ value: 3, name: "3" },
											{ value: 4, name: "4" },
											{ value: 5, name: "5" },
											{ value: -1, name: "beliebig" }
										]
									}}
								/>
								<Setting
									settingName="Mindestumsteigezeit"
									bind:setting={$settings.journeysOptions.transferTime}
									settingInfo={{
										type: "options",
										options: [
											{ value: 0, name: "0min" },
											{ value: 2, name: "2min" },
											{ value: 5, name: "5min" },
											{ value: 10, name: "10min" },
											{ value: 15, name: "15min" },
											{ value: 20, name: "20min" },
											{ value: 30, name: "30min" },
											{ value: 40, name: "40min" },
											{ value: 50, name: "50min" },
											{ value: 60, name: "1h" }
										]
									}}
								/>
							</div>
						{:else if activeTab === 1}
							<div class="settings">
								{#each Object.entries(products) as [product, productName]}
									<Setting
										settingName={productName}
										bind:setting={$settings.journeysOptions.products[product]}
										settingInfo={{ type: "boolean" }}
									/>
								{/each}
							</div>
						{/if}
					</Tabs>
				</Modal>
			{/if}
			<button
				class="hoverable padded-top-bottom button--small"
				type="submit"
				title="Verbindungen suchen"
			>
				<IconSearch />
			</button>
		</div>
	</div>
</form>

<style>
	form {
		width: 100%;
		align-items: center;
	}
	.location-inputs--outer {
		width: 30rem;
		max-width: 100%;
		align-items: center;
	}

	.location-inputs {
		width: 100%;
	}

	.input-container:first-child .add-button {
		visibility: hidden;
	}
	.input-container:first-child .remove-button,
	.input-container:last-child .remove-button {
		display: none;
	}

	.add-button {
		translate: 0 -50%;
		align-self: center;
	}
	.remove-button {
		align-self: center;
	}

	.time-filter-submit {
		width: 100%;
		max-width: 30rem;
		gap: 4px;
		& > * {
			display: flex;
			justify-content: space-between;
		}
		& button {
			width: 100%;
			justify-content: center;
		}
		& .time-input-container {
			height: 3rem;
		}
		& input[type="datetime-local"] {
			padding: 0.5rem;
			width: 100%;
			margin: var(--line-width) auto;
		}
	}

	.filter-submit {
		transition: margin-top 0.4s var(--cubic-bezier);
	}

	.time-is-now .filter-submit {
		margin-top: calc(-3rem + 2 * var(--line-width));
	}

	.settings {
		padding: 0.5rem 1rem;
	}
</style>
