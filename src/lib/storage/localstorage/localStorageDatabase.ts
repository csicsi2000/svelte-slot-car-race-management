import type { RaceInfoDatabase } from "$lib/_types/interfaces/raceInfoDatabase";
import { RaceInfo } from "$lib/_types/raceInfo";

const dataName = "RaceInfoDatabase";

export class LocalStorageDatabase implements RaceInfoDatabase {
    readonly eventName = "raceHistoryChanged";
    private event = new Event(this.eventName);

    setAllRaceInfos(allInfos: RaceInfo[]): boolean {
        try {
            localStorage.setItem(dataName, JSON.stringify(allInfos));
            document.dispatchEvent(this.event);
            return true
        }
        catch {
            console.log("All Raceinfo set failed.")
            return false;
        }
    }

    getRaceInfos(): RaceInfo[] {
        try {
            let allData = localStorage.getItem(dataName);
            if (typeof allData === 'string') {
                let formatted = JSON.parse(allData) as RaceInfo[];
                return formatted;
            }
        }
        finally {
            return [];
        }
    }

    putRaceInfo(raceInfo: RaceInfo): boolean {
        try {
            let allInfos = this.getRaceInfos();
            let existingItem = allInfos.find(x => x.id == raceInfo.id);
            if (existingItem == undefined) {
                allInfos.push(raceInfo);
            } else {
                let index = allInfos.indexOf(existingItem);
                allInfos[index] = raceInfo;
                this.setAllRaceInfos(allInfos);
            }
            return true;
        } catch {
            console.error("Raceinfo adding failed");
            return false;
        }
    }

    deleteRaceInfo(id: string): boolean {
        try {
            let allInfos = this.getRaceInfos();
            let existingItem = allInfos.find(x => x.id == id);
            if (existingItem == undefined) {
                return true;
            } else {
                let index = allInfos.indexOf(existingItem);
                allInfos.splice(index, 1);
                this.setAllRaceInfos(allInfos);
                return true;
            }
        } catch {
            console.error("Raceinfo deletion failed;");
            return false;
        }
    }

}