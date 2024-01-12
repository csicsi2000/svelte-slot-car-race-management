import { RaceStatus } from '$lib/_types/enums/raceStatus'
import { RaceInfo } from '$lib/_types/raceInfo'
import { writable } from 'svelte/store'

export const currentRaceInfo = writable(new RaceInfo(RaceStatus.PRACTICE));

export const sessionStatus = writable(RaceStatus.PRACTICE);

export const newRaceInfo = writable(new RaceInfo(RaceStatus.RACE));