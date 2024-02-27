import { Match } from './Match.mjs'
import { Router } from '../Router.mjs'

export const Any = (definition) => {
  return Match({ ...definition, methods: Router.METHODS })
}
