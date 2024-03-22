import { Match } from './Match.mjs'

/**
 * Options decorator, usefull for decorating controller method for OPTIONS route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../RouteDefinition.mjs').definition} definition
 *
 * @param  {definition} definition
 * @return {Function}
 */
export const Options = (definition) => {
  return Match({ ...definition, methods: ['OPTIONS'] })
}
