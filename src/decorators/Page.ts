import { Match } from './Match'
import { GET } from '../constants'
import { DecoratorRouteDefinition } from '../declarations'

/**
 * Options for configuring the `Page` decorator.
 * Extends `DecoratorRouteDefinition` but excludes the `methods` property,
 * as it is predefined as `'GET'` by the decorator.
 */
export interface PageOptions extends Omit<DecoratorRouteDefinition, 'methods'> {}

/**
 * Decorator to mark a class method as a `GET` route action.
 * Uses the `Match` decorator internally to register the route with the HTTP `GET` method.
 *
 * @param options - Configuration options for the route definition, excluding the `methods` property.
 * @returns A method decorator to be applied to a class method.
 *
 * @example
 * ```typescript
 * import { Page } from '@stone-js/router';
 *
 * class UserController {
 *   @Page({ path: '/users', name: 'getUsers' })
 *   getUsers() {
 *     return 'List of users';
 *   }
 * }
 * ```
 */
export const Page = (path: string, options?: PageOptions): MethodDecorator => Match(path, { ...options, methods: [GET] })
