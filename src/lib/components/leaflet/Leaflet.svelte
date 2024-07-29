<script lang="ts">
	import "leaflet/dist/leaflet.css";
	import "./map.css";
	import {
		displayedJourneys,
		type DisplayedFormData,
		displayedFormData,
		type SelectedJourney,
		selectedJourneys
	} from "$lib/stores/journeyStores";
	import { onDestroy, onMount, setContext } from "svelte";
	import type { DefiningBlock } from "$lib/types";
	import { isTimeDefined } from "$lib/util";
	import Polyline from "$lib/components/leaflet/Polyline.svelte";
	import Marker from "$lib/components/leaflet/Marker.svelte";
	import IconStationLocation from "$lib/components/icons/IconStationLocation.svelte";
	import { settings } from "$lib/stores/settingStore";
	import L from "leaflet";
	import type { ParsedLocation } from "$lib/models/ParsedLocation";
	import { ParsedGeolocation } from "$lib/models/ParsedGeolocation";

	let map: L.Map | undefined;
	let mapElement: HTMLElement;

	let currentPosition: ParsedLocation["position"] | undefined;
	let geolocationWatcher: number | undefined = undefined;

	if ($settings.view.map.geolocation) {
		navigator.geolocation.watchPosition(
			(position) => {
				currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
			},
			() => {
				currentPosition = undefined;
			}
		);
	}

	const resizeObserver = new ResizeObserver(() => {
		map?.invalidateSize();
	});

	$: if (map !== undefined) addLayersToMap(map, $settings.view.map.layers);

	onMount(() => {
		map = L.map(mapElement, { zoomControl: false });
		resizeObserver.observe(mapElement);
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
		resizeObserver.disconnect();
		if (geolocationWatcher !== undefined) {
			navigator.geolocation.clearWatch(geolocationWatcher);
		}
	});

	setContext("map", {
		getMap: () => map
	});

	function addLayersToMap(map: L.Map, layer: typeof $settings.view.map.layers): void {
		if (layer === "osm" || layer === "orm") {
			L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
				maxZoom: 19,
				attribution:
					'&copy; <a href="https:///www.openstreetmap.org/copyright">OpenStreetMap</a>',
				className: "osm-tiles"
			}).addTo(map);
		}
		if (layer === "orm") {
			L.tileLayer("https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png", {
				maxZoom: 19,
				attribution:
					'<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>, Style: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a> and OpenStreetMap',
				className: "orm-tiles"
			}).addTo(map);
		}
		if (layer === "oepnvk") {
			L.tileLayer("https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png", {
				maxZoom: 17,
				attribution:
					'Map <a href="https://memomaps.de/">memomaps.de</a> <a href="http://creativecommons.org/licenses/by-sa/2.0/"> CC-BY-SA</a>, map data <a href="http://openstreetmap.org/"> Openstreetmap</a> <a href="http://opendatacommons.org/licenses/odbl/1.0/">ODbL</a>',
				className: "oepnvk-tiles"
			}).addTo(map);
		}
	}

	$: setMapContent(map, $selectedJourneys, $displayedFormData);

	function setMapContent(
		map: L.Map | undefined,
		selectedJourneys: SelectedJourney[],
		displayedLocations: DisplayedFormData | undefined
	): void {
		if (map === undefined) return;
		let coordinates: L.LatLngLiteral[];
		if (selectedJourneys.filter((j) => j.selectedBy !== -1).length !== 0) {
			coordinates = selectedJourneys
				.flatMap((j) => j.blocks)
				.filter<DefiningBlock>(isTimeDefined)
				.flatMap((block) =>
					block.type === "leg"
						? [
								block.departureData.location.position,
								...block.stopovers.map((s) => s.location.position),
								block.arrivalData.location.position
							]
						: block.location.position
				);
		} else if (displayedLocations !== undefined) {
			coordinates = displayedLocations.locations.map((location) => location.value.position);
		} else {
			// fit germany
			coordinates = [
				{ lat: 55.0, lng: 6.332 },
				{ lat: 47.5, lng: 14.635 }
			];
		}
		map.fitBounds(L.latLngBounds(coordinates), {
			paddingTopLeft: [20, 50],
			paddingBottomRight: [20, 100]
		});
	}
</script>

<div
	class="map"
	bind:this={mapElement}
	data-theme={$settings.view.map.darkFilter && $settings.view.general.darkTheme
		? "dark"
		: "light"}
>
	{#if map !== undefined}
		{#each $displayedJourneys as journey (journey.key)}
			{#each journey.value as block}
				{#if block.type === "leg"}
					<Polyline {block} />
					{#if block.precededBy === undefined}
						<Marker data={block.departureData} product2={block.line.product ?? ""}>
							<IconStationLocation
								color="product"
								iconType="station"
								cancelled={block.departureData.attribute === "cancelled"}
							/>
						</Marker>
					{/if}
					{#each block.stopovers as stopover}
						<Marker
							data={stopover}
							product1={block.line.product ?? ""}
							product2={block.line.product ?? ""}
						>
							<IconStationLocation
								color="product"
								iconType="station"
								smallIcon={true}
								cancelled={stopover.attribute === "cancelled"}
							/>
						</Marker>
					{/each}
					{#if block.succeededBy === undefined}
						<Marker data={block.arrivalData} product1={block.line.product ?? ""}>
							<IconStationLocation
								color="product"
								iconType="station"
								cancelled={block.arrivalData.attribute === "cancelled"}
							/>
						</Marker>
					{/if}
					{#if block.currentLocation !== undefined}
						<Marker
							data={{
								location: block.currentLocation,
								time: {},
								platformData: null
							}}
						>
							<svg
								width="16px"
								height="16px"
								xmlns="http://www.w3.org/2000/svg"
								class="product--{block.line.product}"
							>
								<circle
									cx="8"
									cy="8"
									r="5.5"
									fill="var(--background-color)"
									stroke="var(--foreground-color)"
								/>
								<circle cx="8" cy="8" r="3" fill="var(--product-color)" />
							</svg>
						</Marker>
					{/if}
				{:else if block.type === "transfer"}
					<Marker
						data={block.transitData}
						product1={block.arrivalProduct ?? ""}
						product2={block.departureProduct ?? ""}
					>
						<IconStationLocation
							color="product"
							iconType="station"
							secondaryProduct={block.departureProduct}
							smallIcon={block.isStopover}
							cancelled={block.transitData.attribute === "cancelled" &&
								block.transitData.attribute2 === "cancelled"}
						/>
					</Marker>
				{:else if block.type === "location" && !block.hidden}
					<Marker
						data={{
							location: block.location,
							time: block.time,
							platformData: null
						}}
					>
						<IconStationLocation
							color="foreground"
							iconType={block.location.name === "Standort"
								? "currentLocation"
								: block.location.type}
						/>
					</Marker>
				{:else if block.type === "walk" || block.type === "onward-journey"}
					<Polyline {block} />
				{/if}
			{/each}
		{/each}
		{#if currentPosition !== undefined}
			<Marker
				data={{
					location: ParsedGeolocation.createUserCurrentLocation(currentPosition),
					time: {},
					platformData: null
				}}
			>
				<IconStationLocation iconType={"currentLocation"} color={"accent"} />
			</Marker>
		{/if}
	{/if}
</div>

<style>
	.map {
		width: 100%;
		height: 100%;
		position: absolute;
		bottom: 0;
	}
</style>
