import { Address } from "viem"
export function toViemAddress(address: string): Address {
    let addressNoPrefix = address.replace("0x", "")
    console.log("addressNoPrefix is ", addressNoPrefix)
    return `0x${addressNoPrefix}`
}