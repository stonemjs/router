import { Match } from './Match.mjs'

export const Post = (definition) => {
  return Match({ ...definition, methods: ['POST'] })
}
