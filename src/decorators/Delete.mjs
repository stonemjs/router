import { Match } from './Match.mjs'

/**
 * Delete decorator, Useful for decorating controller method for DELETE route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Delete = (definition) => {
  return Match({ ...definition, methods: ['DELETE'] })
}
