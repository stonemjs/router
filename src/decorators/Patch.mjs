import { Match } from './Match.mjs'

export const Patch = (definition) => {
  return Match({ ...definition, methods: ['PATCH'] })
}
