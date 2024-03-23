import { LogicException, isClass, isMethod, MetaProperty } from '@stone-js/common'

/**
 * Decorators, usefull for decorating class for route definitions.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @namespace Decorators
 */

/**
 * definition.
 *
 * @typedef  {Object} definition
 * @property {string} path
 * @property {string} method
 * @property {Function|Object} action
 * @property {string=} name
 * @property {string=} alias
 * @property {Object=} rules
 * @property {string=} domain
 * @property {Object=} actions - Frontend context
 * @property {Object=} bindings
 * @property {Object=} defaults
 * @property {string=} redirect
 * @property {Array<string>=} methods
 * @property {Array<Function>=} throttle
 * @property {Array<Function>=} middleware
 * @property {Array<definition>=} children
 * @property {boolean} [fallback=false]
 * @property {Array<Function>=} excludeMiddleware
 */

/**
 * Match decorator, usefull for decorating controller method for any route definition.
 *
 * @memberOf Decorators
 * @param  {definition} definition
 * @return {Function}
 * @example
 * class UserController {
 *
 *    Match({
 *      name: 'users.edit',
 *      path: '/users/:id(\\d+)',
 *      methods: ['PUT', 'PATCH']
 *    })
 *    edit({ request, params }) {
 *      return Response.ok()
 *    }
 * }
 */
export const Match = (definition) => {
  return (target, name, descriptor) => {
    if (!isClass(target) || (!isMethod(descriptor.value) && !(descriptor.value instanceof MetaProperty))) {
      throw new LogicException('This decorator can only be applied at method level')
    }

    descriptor.value = new MetaProperty(name, descriptor.value, { decorators: { route: { ...definition, action: { [name]: target }, method: undefined } } })

    return descriptor
  }
}
