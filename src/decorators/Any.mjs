import { Match } from './Match.mjs'
import { HTTP_METHODS } from '../enums/http-methods.mjs'

/**
 * Any decorator, usefull for decorating controller method for any route definition.
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
