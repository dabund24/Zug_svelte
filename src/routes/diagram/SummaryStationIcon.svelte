<script lang="ts">
	import IconStationLocation from "$lib/components/icons/IconStationLocation.svelte";
	import { fade, fly } from "svelte/transition";
	import { addDisplayedLocation, removeDisplayedLocation } from "$lib/stores/journeyStores";
	import type { ParsedLocation } from "$lib/models/ParsedLocation";
	export let location: ParsedLocation;
	export let locationIndex: number;
	export let actsAsStopover: boolean = false;
	export let isDisplayedLocation: boolean;
	export let pressedStationId: number;
	let thisPressedId = -1
	$: isPressed = thisPressedId === pressedStationId;

	function handleStationPress(): void {
		if (!isPressed) {
			thisPressedId = pressedStationId + 1
		}
		pressedStationId++
	}
</script>

{#if isPressed && !isDisplayedLocation}
	<div class="icon-neighbor location-name" transition:fade={{ duration: 200 }}>
		{location.name}
	</div>
{/if}
<button
	class="icon-container hoverable"
	aria-pressed={isPressed}
	on:click={handleStationPress}
	title={location.name}
>
	<IconStationLocation color={"product"} iconType={location.type} smallIcon={actsAsStopover} />
</button>
{#if isPressed && isDisplayedLocation}
	<button
		class="icon-neighbor action-button"
		on:click={() => void removeDisplayedLocation(locationIndex)}
		transition:fly={{ y: -36 }}
		title="Station als Zwischenstation entfernen"
	>
		<svg width="16px" height="16px">
			<g stroke="var(--foreground-color)" stroke-width="3" stroke-linecap="round">
				<line x1="3" y1="3" x2="13" y2="13" />
				<line x1="3" y1="13" x2="13" y2="3" />
			</g>
		</svg>
	</button>
{:else if isPressed}
	<button
		class="icon-neighbor action-button"
		transition:fly={{ y: -36 }}
		on:click={() => void addDisplayedLocation(location, locationIndex + 1)}
		title="Station als Zwischenstation hinzufügen"
	>
		<svg width="16px" height="16px">
			<g stroke="var(--foreground-color)" stroke-width="3" stroke-linecap="round">
				<line x1="8" y1="2" x2="8" y2="14" />
				<line x1="2" y1="8" x2="14" y2="8" />
			</g>
		</svg>
	</button>
{/if}

<style>
	.icon-container {
		display: flex;
		padding: 4px;
		border-radius: 100%;
		cursor: pointer;
		position: relative;
		z-index: 1;
	}
	.icon-container[aria-pressed="true"] {
		border: var(--border);
		background-color: var(--background-color);
	}

	.location-name {
		border-radius: var(--border-radius--large);
		bottom: 36px;
		padding: 4px;
		width: max-content;
		max-width: calc(var(--connection-width) / 2);
	}
	.action-button {
		display: flex;
		border-radius: 50%;
		top: 36px;
		padding: 4px;
	}
	.icon-neighbor {
		position: absolute;
		border: var(--border);
		background-color: var(--background-color--opaque);
		backdrop-filter: var(--blur);
		-webkit-backdrop-filter: var(--blur);
		translate: calc(16px - 50%) 0;
	}
</style>
