import { Match } from "./Match.mjs"

export const Options = (definition) => {
  return Match({ ...definition, methods: ['OPTIONS'] })
}