import { Match } from './Match.mjs'

/**
 * Patch decorator, usefull for decorating controller method for PATCH route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../RouteDefinition.mjs').definition} definition
 *
 * @param  {definition} definition
 * @return {Function}
 */
export const Patch = (definition) => {
  return Match({ ...definition, methods: ['PATCH'] })
}
