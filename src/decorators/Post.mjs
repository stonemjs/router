import { Match } from './Match.mjs'

/**
 * Post decorator, usefull for decorating controller method for POST route definition.
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
