<script lang="ts">
	import type { TransitData } from "$lib/types";

	export let transitData: TransitData;
	export let nameIsStrong = false;

	$: stationOuterTag = nameIsStrong ? "strong" : "span";

	$: stationInnerTag = transitData.attribute === "cancelled" ? "s" : "span";

	let locationName = transitData.location.name;

	$: if (transitData.location.type === "currentLocation") {
		locationName = transitData.location.toRelativeString();
	}

	let delayTextA = "";
	$: if (transitData.time.arrival?.delay !== undefined) {
		delayTextA = `(+${transitData.time.arrival.delay})`;
	}
	let delayTextB = "";
	$: if (transitData.time.departure?.delay !== undefined) {
		delayTextB = `(+${transitData.time.departure.delay})`;
	}

	$: platformData = transitData.platformData;
	$: platformData2 = transitData.platformData2;
</script>

<div class="flex-row name-delay-platform">
	<svelte:element
		this={stationOuterTag}
		class="station"
		class:text--red={transitData.attribute === "cancelled"}
		class:text--blue={transitData.attribute === "additional"}
	>
		<svelte:element this={stationInnerTag} class:limit-lines={nameIsStrong}>
			{locationName}
		</svelte:element>
	</svelte:element>
	<div class="flex-column">
		{#if transitData.time.arrival !== undefined}
			<span class="delay text--{transitData.time.arrival?.status}">&#8203;{delayTextA}</span>
		{/if}
		{#if transitData.time.departure !== undefined}
			<span class="delay text--{transitData.time.departure?.status}">&#8203;{delayTextB}</span>
		{/if}
	</div>

	<div class="platform flex-column">
		{#if platformData === null}
			<div>&#8203;</div>
		{:else}
			<div class="platform-text" class:text--red={platformData.platformChanged}>
				Gl. {platformData.platform}
			</div>
		{/if}
		{#if platformData2 === null}
			<div>&#8203;</div>
		{:else if platformData2 !== undefined}
			<div class="platform-text" class:text--red={platformData2.platformChanged}>
				Gl. {platformData2.platform}
			</div>
		{/if}
	</div>
</div>

<style>
	.name-delay-platform {
		width: 100%;
	}
	.station {
		text-overflow: ellipsis;
		overflow-x: hidden;
		/*noinspection CssInvalidPropertyValue*/
		text-wrap: balance;
	}

	.limit-lines {
		-webkit-line-clamp: 2;
	}

	:global(.popup__content) .station {
		text-wrap: unset;
		word-wrap: normal;
	}

	.delay {
		padding-left: 4px;
		white-space: nowrap;
	}
	.flex-row {
		align-items: center;
	}
	.platform {
		margin-left: auto;
		white-space: nowrap;
		text-align: right;
	}
	.platform-text {
		padding-left: 0.5rem;
	}
</style>
