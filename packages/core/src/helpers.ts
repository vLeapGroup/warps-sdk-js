import { Warp } from "./types"

export const transformWarp = (warp: Warp): object => {
    return {
        name: warp.name,
        description: warp.description,
        actions: warp.actions,
    }
}
