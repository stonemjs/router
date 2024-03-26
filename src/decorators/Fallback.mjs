import { Match } from './Match.mjs'

/**
 * Fallback decorator, usefull for decorating controller method as fallback.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Fallback = (definition) => {
  return Match({ ...definition, methods: ['GET'], fallback: true })
}
