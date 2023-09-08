import { Match } from './Match.mjs'

export const Get = (definition) => {
  return Match({ ...definition, methods: ['GET'] })
}
