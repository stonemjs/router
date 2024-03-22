import { Match } from './Match.mjs'

/**
 * Delete decorator, usefull for decorating controller method for DELETE route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../RouteDefinition.mjs').definition} definition
 *
 * @param  {definition} definition
 * @return {Function}
 */
export const Delete = (definition) => {
  return Match({ ...definition, methods: ['DELETE'] })
}
