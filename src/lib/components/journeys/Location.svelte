<script lang="ts">
	import type { LocationBlock } from "$lib/types";
	import Time from "$lib/components/Time.svelte";
	import IconStationLocation from "$lib/components/icons/IconStationLocation.svelte";
	import { ParsedGeolocation } from "$lib/models/ParsedGeolocation";

	export let block: LocationBlock

	let location = block.location

	let locationName = location.name
	let locationType = location.type

	if (location instanceof ParsedGeolocation) {
		locationName = location.toRelativeString()
	}
</script>

<div class="flex-row">
	<div class="time-container">
		<Time time={block.time} />
	</div>
	<IconStationLocation iconType={locationType} color={"foreground"} />
	<strong>{locationName}</strong>
</div>

<style>
	.flex-row {
		height: 3rem;
		gap: .5rem;
		align-items: center;
	}
</style>