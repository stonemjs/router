import { GROUP_KEY } from './constants'
import { DecoratorGroupRouteDefinition } from '../declarations'
import { classDecoratorLegacyWrapper, ClassType, setMetadata, SERVICE_KEY } from '@stone-js/core'

/**
 * Options for the `Controller` decorator, extending group route definition options.
 */
export interface ControllerOptions extends DecoratorGroupRouteDefinition {}

/**
 * A class decorator for defining a controller with a common base path.
 * Configures the class as a singleton service.
 *
 * @param path - The base path for the controller's routes.
 * @param options - Optional configuration for the controller.
 * @returns A class decorator configured for routing and singleton service.
 *
 * @example
 * ```typescript
 * @Controller('/users')
 * class UserController {
 *   // Controller logic
 * }
 * ```
 */
export const Controller = <T extends ClassType = ClassType>(path: string, options?: ControllerOptions): ClassDecorator => {
  return classDecoratorLegacyWrapper((_target: T, context: ClassDecoratorContext<T>): undefined => {
    setMetadata(context, GROUP_KEY, { ...options, path })
    setMetadata(context, SERVICE_KEY, { singleton: true })
  })
}
