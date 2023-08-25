import { GROUP_KEY } from './constants'
import { DecoratorGroupRouteDefinition } from '../declarations'
import { classDecoratorLegacyWrapper, ClassType, setMetadata } from '@stone-js/core'

/**
 * Options for the `Group` decorator, extending group route definition options.
 */
export interface GroupOptions extends DecoratorGroupRouteDefinition {}

/**
 * A class decorator for defining a group of routes with a common base path.
 *
 * @param path - The base path for the group of routes.
 * @param options - Optional configuration for the route group.
 * @returns A class decorator configured for a group of routes.
 *
 * @example
 * ```typescript
 * @Group('/users')
 * class UserController {
 *   // Grouped route definitions
 * }
 * ```
 */
export const Group = <T extends ClassType = ClassType>(path: string, options?: GroupOptions): ClassDecorator => {
  return classDecoratorLegacyWrapper((_target: T, context: ClassDecoratorContext<T>): undefined => {
    setMetadata(context, GROUP_KEY, { ...options, path })
  })
}
