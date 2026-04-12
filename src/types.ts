export type Theme = 'dark' | 'light'

export type CkksCiphertext = {
  c0: number[]
  c1: number[]
  slots: number[]
  scale: number
  level: number
  encoding: string
  label: string
  noiseBitsLost: number
}

export type CkksParams = {
  n: number
  slotCount: number
  baseScale: number
  modChain: number[]
}
