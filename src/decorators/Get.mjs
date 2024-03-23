import { Match } from './Match.mjs'

/**
 * Get decorator, usefull for decorating controller method for GET route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Get = (definition) => {
  return Match({ ...definition, methods: ['GET'] })
}
