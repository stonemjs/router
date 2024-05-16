import { Match } from './Match.mjs'

/**
 * Post decorator, Useful for decorating controller method for POST route definition.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 */
export const Post = (definition) => {
  return Match({ ...definition, methods: ['POST'] })
}
