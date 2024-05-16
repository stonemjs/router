import { Match } from './Match.mjs'

/**
 * Patch decorator, Useful for decorating controller method for PATCH route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Patch = (definition) => {
  return Match({ ...definition, methods: ['PATCH'] })
}
