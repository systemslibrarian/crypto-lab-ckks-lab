import { describe, expect, it } from 'vitest'
import { COEFFICIENTS, modeledResponse, narrowCandidates } from '../src/reactionModel'

describe('abstract two-phase reaction decision table', () => {
  it('support checks zero; sign checks positive one', () => {
    expect(COEFFICIENTS.map(s => modeledResponse(s, 'support'))).toEqual([false, true, false])
    expect(COEFFICIENTS.map(s => modeledResponse(s, 'sign'))).toEqual([false, false, true])
  })

  it('two visible bits distinguish ternary hypotheses without exposing a plaintext', () => {
    for (const secret of COEFFICIENTS) {
      let candidates = narrowCandidates(COEFFICIENTS, 'support', modeledResponse(secret, 'support'))
      candidates = narrowCandidates(candidates, 'sign', modeledResponse(secret, 'sign'))
      expect(candidates).toEqual([secret])
    }
  })
})
