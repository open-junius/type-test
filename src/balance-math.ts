export const TAO = BigInt(1000000000) // 10^9
export const ETHPerRAO = BigInt(1000000000) // 10^9

export function tao(value: number) {
    return TAO * BigInt(value)
}

export function raoToEth(value: bigint) {
    return ETHPerRAO * value
}

