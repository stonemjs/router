import { Match } from './Match.mjs'

export const Put = (definition) => {
  return Match({ ...definition, methods: ['PUT'] })
}
