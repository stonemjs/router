import { Match } from './Match.mjs'
import { HTTP_METHODS } from '@stone-js/event-foundation'

/**
 * Any decorator, Useful for decorating controller method for any route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Any = (definition) => {
  return Match({ ...definition, methods: HTTP_METHODS })
}
