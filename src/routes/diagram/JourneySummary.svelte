<script lang="ts">
	import { scale } from "svelte/transition";
	import { flip } from "svelte/animate";
	import { displayedFormData, mergingBlocks, selectedJourneys } from "$lib/stores/journeyStores.js";
	import type { JourneyBlock, LegBlock, ParsedTime } from "$lib/types.js";
	import Time from "$lib/components/Time.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import LegRegular from "$lib/components/journeys/LegRegular.svelte";
	import SummaryStationIcon from "./SummaryStationIcon.svelte";
	import { dateDifference } from "$lib/util";
	import Duration from "$lib/components/Duration.svelte";
	import DateDuration from "$lib/components/DateDuration.svelte";
	import { page } from "$app/stores";
	import { pushState } from "$app/navigation";
	import Warning from "$lib/components/Warning.svelte";
	import { ParsedGeolocation } from "$lib/models/ParsedGeolocation";

	type JourneyInfo = {
		legs: LegBlock[];
		departure: ParsedTime;
		arrival: ParsedTime;
	};

	$: journeyInfo = [
		...$selectedJourneys.map((selectedJourney) => {
			return {
				legs: selectedJourney.blocks.filter<LegBlock>(isLeg),
				departure: { departure: { time: selectedJourney.departure.departure?.time } },
				arrival: { arrival: {time: selectedJourney.arrival.arrival?.time} }
			};
		}),
		{ legs: [], departure: {}, arrival: {} }
	] as JourneyInfo[];

	function isLeg(block: JourneyBlock): block is LegBlock {
		return block.type === "leg";
	}

	let pressedStationId = 0;

	let modalLeg: LegBlock | undefined;
	function showLegModal(leg: LegBlock): void {
		modalLeg = { ...leg };
		pushState("", {
			showLegModal: true
		});
	}

	$: areStopovers = $mergingBlocks.map((block) => block?.type === "transfer" && block.isStopover);
</script>

<div class="flex-column" id="journey-summary">
	<div class="flex-row">
		{#each $displayedFormData?.locations ?? [] as location, i (location.key)}
			<div
				class="summary-element flex-column"
				class:station--selected={journeyInfo[i].legs.length > 0}
				transition:scale
				animate:flip={{ duration: 400 }}
			>
				<strong class="station-name"
					>{location.value instanceof ParsedGeolocation
						? location.value.toRelativeString()
						: location.value.name}</strong
				>
				<div class="visuals-container flex-row">
					<div class="station-icon-container">
						<SummaryStationIcon
							location={location.value}
							locationIndex={i}
							actsAsStopover={areStopovers[i]}
							isDisplayedLocation={true}
							bind:pressedStationId
						/>
					</div>
					<div class="visuals--selected">
						<div class="intermediate-stations flex-row">
							<!--
						TODO change transition after https://github.com/sveltejs/svelte/issues/10251 is resolved
						-->
							{#each journeyInfo[i].legs.slice(1) as leg (leg.departureData.location.requestParameter)}
								<div
									class="station-icon-container"
									in:scale
									out:scale
									animate:flip={{ duration: 400 }}
								>
									<SummaryStationIcon
										location={leg.departureData.location}
										locationIndex={i}
										isDisplayedLocation={false}
										bind:pressedStationId
									></SummaryStationIcon>
								</div>
							{/each}
						</div>
						<div class="lines flex-row">
							{#each journeyInfo[i].legs as leg (leg.blockKey)}
								<div in:scale={{}} animate:flip={{ duration: 400 }}>
									<button
										class="desktop-line-container hoverable"
										on:click={() => void showLegModal(leg)}
										title={leg.line.name}
									>
										<span class="line--product product--{leg.line.product}"
										></span>
									</button>
								</div>
							{/each}
						</div>
					</div>
				</div>
				<div class="times-container flex-row">
					<div class="times--station flex-row">
						<span class="arrival-time">
							<Time time={journeyInfo.at(i - 1)?.arrival ?? {}} />
						</span>
						<span class="wait-time">
							<Duration
								duration={dateDifference(
									journeyInfo.at(i - 1)?.arrival.arrival?.time,
									journeyInfo[i].departure.departure?.time
								)}
							/>
						</span>
						<span class="departure-time time">
							<Time time={journeyInfo[i].departure ?? {}} />
						</span>
					</div>
					<div class="times--journey flex-row">
						<Duration
							duration={dateDifference(
								journeyInfo[i].departure.departure?.time,
								journeyInfo[i].arrival.arrival?.time
							) ?? 0}
						/>
					</div>
				</div>
			</div>
		{/each}
	</div>
	<div class="transition"></div>
</div>
{#if $page.state.showLegModal && modalLeg}
	<Modal
		bind:showModal={$page.state.showLegModal}
		title={`${modalLeg.line.name} → ${modalLeg.direction}`}
	>
		<div class="modal-content">
			{#if modalLeg.attribute === "cancelled"}
				<Warning message="Fahrt entfällt" color="red" />
			{/if}
			<DateDuration
				date={modalLeg.departureData.time.departure?.time}
				duration={modalLeg.duration}
			/>
			<LegRegular block={modalLeg} compact={true} />
		</div>
	</Modal>
{/if}

<style>
	#journey-summary {
		position: sticky;
		z-index: 5;
		top: 0;
		width: var(--diagram-width);
		transition: width 0.4s var(--cubic-bezier);
		& > :first-child {
			padding: max(env(safe-area-inset-top), 1rem) 0.5rem 0.5rem;
			margin: 0 -0.5rem;
			background-color: var(--background-color--opaque);
			backdrop-filter: var(--blur);
			-webkit-backdrop-filter: var(--blur);
		}
		& > :last-child {
			padding: 0 0.5rem;
			margin: 0 -0.5rem;
		}
		--beginning-end-offset: 1.5em;
		word-break: break-word;
	}

	@media screen and (min-width: 1000px) {
		#journey-summary {
			top: -1rem;
		}
	}

	:global(.pane:has(~ .dragging)) #journey-summary,
	:global(.container.loading) #journey-summary {
		transition: none;
	}

	.summary-element {
		width: var(--diagram-width);
		margin-top: auto;
		flex: 2 0;
		text-align: center;
		--product-color: var(--foreground-color);
		&:first-child,
		&:last-child {
			flex: 1 0;
		}
	}

	.station--selected,
	.station--selected + .summary-element {
		--product-color: var(--accent-color);
	}

	/* handle special cases */

	.summary-element:nth-last-child(2) .times-container {
		margin-right: calc(var(--connection-width) / -2 + var(--beginning-end-offset));
	}

	.summary-element:first-child {
		& .station-name {
			text-align: left;
		}
		& .visuals-container {
			margin: 0 calc(var(--connection-width) / -2) 0 var(--beginning-end-offset);
			& > .station-icon-container {
				left: 0;
			}
		}
		& .visuals--selected {
			margin: 0;
		}
		& .times-container {
			margin: 0 calc(var(--connection-width) / -2) 0 var(--beginning-end-offset);
		}
	}

	.summary-element:nth-last-child(2):not(:first-child) .visuals--selected {
		margin: 0 calc(var(--connection-width) / -2 + var(--beginning-end-offset)) 0
			calc(var(--connection-width) / 2);
	}

	.summary-element:first-child:nth-last-child(2) {
		& .visuals-container,
		& .times-container {
			margin: 0 calc(var(--connection-width) / -2 + var(--beginning-end-offset)) 0
				var(--beginning-end-offset);
		}
	}

	.summary-element:last-child {
		& .station-name {
			text-align: right;
		}
		& .visuals-container {
			margin: 0 var(--beginning-end-offset) 0 auto;
		}
		& .times-container {
			margin: 0 0 0 calc(var(--connection-width) / 2 - var(--beginning-end-offset));
		}
		& .times--journey {
			width: 0;
		}
	}

	/* rules for name */

	.station-name {
		width: 100%;
		overflow-x: hidden;
		text-overflow: ellipsis;
		/*noinspection CssInvalidPropertyValue*/
		text-wrap: balance;
	}

	/* rules for everything between name and time data */

	.visuals-container {
		height: calc(24px + 2 * var(--line-width));
		& .visuals--selected {
			position: relative;
			width: 100%;
			height: 100%;
			margin: 0 calc(var(--connection-width) / -2) 0 calc(var(--connection-width) / 2);
		}
		& .lines {
			position: absolute;
			width: 100%;
			height: 100%;
			& > * {
				width: 100%;
			}
		}
		& .intermediate-stations {
			position: absolute;
			width: 100%;
			justify-content: space-evenly;
		}
		& .station-icon-container {
			z-index: 2;
			position: relative;
			margin: 0 -16px;
			border-radius: 100%;
		}
		& > .station-icon-container {
			left: 50%;
		}
		& .desktop-line-container {
			align-self: center;
			height: 100%;
			width: calc(100% + 32px);
			display: flex;
			align-items: center;
			border-radius: 50vh;
			margin: 0 -16px;
			padding: 0 12px;
			&:hover {
				position: relative;
				z-index: 1;
			}
			& .line--product {
				width: 100%;
				height: var(--line-width);
				border-radius: var(--border-radius--small);
			}
		}
	}

	/* rules for times-container */

	.times-container {
		margin: 0 calc(var(--connection-width) / -2) 0 calc(var(--connection-width) / 2);
		z-index: 1;
		white-space: nowrap;
		position: relative;
	}

	.times--station {
		position: absolute;
		translate: -50% 0;
		& > * {
			display: none;
		}
	}

	.times--journey {
		width: 100%;
		visibility: hidden;
	}

	/* selected journey */
	.station--selected .times--journey {
		display: inline;
	}

	/* show wait time between two selected journeys */
	.station--selected + .station--selected .wait-time {
		display: inline;
	}

	/* show departure when not preceded by selected journey */
	.summary-element:not(.station--selected) + .station--selected .departure-time,
	.station--selected:first-child .departure-time {
		display: inline;
	}

	/* show arrival when not succeeded by selected journey */
	.station--selected + .summary-element:not(.station--selected) .arrival-time {
		display: inline;
	}

	.station--selected .times--journey {
		visibility: visible;
	}

	.modal-content {
		padding: 0.5rem 1rem 0.5rem;
	}
</style>
