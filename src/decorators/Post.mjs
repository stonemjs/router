import { Match } from './Match.mjs'

/**
 * Post decorator, usefull for decorating controller method for POST route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../RouteDefinition.mjs').definition} definition
 *
 * @param  {definition} definition
 * @return {Function}
 */
export const Post = (definition) => {
  return Match({ ...definition, methods: ['POST'] })
}
