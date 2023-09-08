import { Match } from "./Match.mjs"

export const Delete = (definition) => {
  return Match({ ...definition, methods: ['DELETE'] })
}