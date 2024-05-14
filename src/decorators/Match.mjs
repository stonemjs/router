import { MetaProperty } from '@stone-js/common'

/**
 * Decorators, usefull for decorating class for route definitions.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @namespace Decorators
 */

/**
 * Standard definition properties.
 *
 * @typedef  {Object} definition
 * @property {string} path - Path to match the user event.
 * @property {string} method - Http method.
 * @property {Function|Object} action - Action to be invoked when running route.
 * @property {string=} name - Route name.
 * @property {string=} alias - Define aliases for path and resolve it internally. Example, { path: '/users', alias: '/people' } will match both /users and /people
 * @property {Object=} rules - Define regex for path params definition.
 * @property {string=} domain - Domain to match user event domain.
 * @property {string=} protocol - Protocol to match user event protocol. Example, http or https.
 * @property {Object=} actions - Many actions for frontend context.
 * @property {Object=} bindings -  Resolve parameters from database models, passing class must have `resolveRouteBinding` as static or instance method.
 * @property {Object=} defaults - Define default route params values.
 * @property {(string|Object|Function)} [redirect] - Redirect event from one route to another route.
 * @property {Array<string>=} methods - Http methods.
 * @property {Array<Function>=} throttle - Defined rate limiter for routes.
 * @property {Array<Function>=} middleware - Route Middleware.
 * @property {Array<definition>=} children - Group explicit route definitions.
 * @property {boolean} [strict=false] - Strict regex pattern mode for case sensitive and trailing slash.
 * @property {boolean} [fallback=false] - Define default action when no routes matches.
 * @property {Array<Function>=} excludeMiddleware - Route exclude Middleware.
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
 *    edit({ event, params }) {
 *      return Response.ok()
 *    }
 * }
 */
export const Match = (definition = {}) => {
  return (value, { kind, name }) => {
    if (kind !== 'method') {
      throw new TypeError('This decorator can only be applied at method level')
    }

    return function () {
      return new MetaProperty(name, value, { route: { ...definition, action: name, method: undefined } })
    }
  }
}
