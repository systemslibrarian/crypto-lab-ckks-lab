/**
 * Abstract one-coefficient decision table from Bian et al. §3, not CKKS math.
 * Their actual probes require a public key, C2S evaluation keys and carefully
 * bounded ciphertext noise. This model only teaches what the returned bit
 * could distinguish once those preconditions hold.
 */
export type Coefficient = -1 | 0 | 1
export type Probe = 'support' | 'sign'
export const COEFFICIENTS: readonly Coefficient[] = [-1, 0, 1]

export function modeledResponse(secret: Coefficient, probe: Probe): boolean {
  return probe === 'support' ? secret === 0 : secret === 1
}

export function narrowCandidates(
  candidates: readonly Coefficient[], probe: Probe, observedAccept: boolean,
): Coefficient[] {
  return candidates.filter(candidate => modeledResponse(candidate, probe) === observedAccept)
}
