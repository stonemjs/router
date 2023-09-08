import { Router } from '../Router.mjs'
import { Match } from './Match.mjs'

export const Any = (definition) => {
  return Match({ ...definition, methods: Router.METHODS })
}
