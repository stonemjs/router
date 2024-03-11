import { Match } from './Match.mjs'
import { HTTP_METHODS } from '../enums/http-methods.mjs'

export const Any = (definition) => {
  return Match({ ...definition, methods: HTTP_METHODS })
}
