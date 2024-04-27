<script lang="ts">
	import StationInput from "./StationInput.svelte";
	import { type KeyedItem, type ParsedLocation } from "$lib/types.js";
	import { valueIsDefined } from "$lib/util.js";
	import { displayedLocations, setDisplayedLocations } from "$lib/stores.js";
	import { scale } from "svelte/transition";
	import { flip } from "svelte/animate";
	import Modal from "$lib/components/Modal.svelte";
	import Tabs from "$lib/components/Tabs.svelte";
	import Setting from "$lib/components/Setting.svelte";
	import { products, settings } from "$lib/settings";
	import { onMount } from "svelte";
	import IconFilter from "$lib/components/icons/IconFilter.svelte";
	import IconSearch from "$lib/components/icons/IconSearch.svelte";
	import { pushState } from "$app/navigation";
	import { page } from "$app/stores";

	let stops: KeyedItem<ParsedLocation | undefined, number>[] =
		$displayedLocations.locations.length === 0
			? [
					{ value: undefined, key: Math.random() },
					{ value: undefined, key: Math.random() }
				]
			: $displayedLocations.locations;

	let time: string;
	let timeRole: "departure" = "departure" as const;

	onMount(() => {
		let timeToBeDisplayed =
			$displayedLocations.time.getTime() === 0 ? new Date() : $displayedLocations.time;

		// Adjust for local time zone offset
		const timezoneOffset = timeToBeDisplayed.getTimezoneOffset() * 60000;
		const timeIsoString = new Date(timeToBeDisplayed.getTime() - timezoneOffset).toISOString();

		time = timeIsoString.substring(0, timeIsoString.indexOf("T") + 6);
	});

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
	function handleFormSubmit(): void {
		const stopsToBeDisplayed = stops.filter<KeyedItem<ParsedLocation, number>>(
			valueIsDefined<ParsedLocation, number>
		);
		if (stopsToBeDisplayed.length >= 2) {
			setDisplayedLocations(stopsToBeDisplayed, new Date(time), timeRole);
		}
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
						tabindex="-1"
						on:click={() => void addVia(i + 1)}
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
						tabindex="-1"
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
	</div>
	<div class="flex-row time-filter-submit">
		<label class="time hoverable">
			<span>Abfahrt:</span>
			<input type="datetime-local" bind:value={time} />
		</label>
		<div>
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
			<button class="hoverable padded-top-bottom button--small" type="submit" title="Verbindungen suchen">
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
	}

	.location-inputs {
		width: 100%;
	}

	.input-container:last-child .add-button {
		visibility: hidden;
	}
	.input-container:first-child .remove-button,
	.input-container:last-child .remove-button {
		visibility: hidden;
	}

	.add-button {
		translate: 0 50%;
		align-self: center;
	}
	.remove-button {
		align-self: center;
	}

	.time-filter-submit {
		flex-wrap: wrap;
		width: 100%;
		max-width: 30rem;
		& > * {
			width: 100%;
			white-space: nowrap;
			flex: 1 0;
			display: flex;
		}
		& button {
			width: 100%;
			justify-content: center;
		}
	}

	.time {
		white-space: nowrap;
		padding: 0.5rem;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		& > input {
			outline: none;
			border: none;
		}
	}

	.settings {
		padding: 0.5rem 1rem;
	}
</style>