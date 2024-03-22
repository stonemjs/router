import { Match } from './Match.mjs'

/**
 * Put decorator, usefull for decorating controller method for PUT route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../RouteDefinition.mjs').definition} definition
 *
 * @param  {definition} definition
 * @return {Function}
 */
export const Put = (definition) => {
  return Match({ ...definition, methods: ['PUT'] })
}
