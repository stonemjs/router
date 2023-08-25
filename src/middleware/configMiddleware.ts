import { NODE_CONSOLE_PLATFORM } from '../constants'
import { MixedPipe, NextPipe } from '@stone-js/pipeline'
import { GROUP_KEY, MATCH_KEY } from '../decorators/constants'
import { RouterCommand, routerCommandOptions } from '../commands/RouterCommand'
import { CommandOptions, NodeCliAdapterConfig, RouteDefinition } from '../declarations'
import { ConfigContext, IBlueprint, ClassType, hasMetadata, getMetadata } from '@stone-js/core'

/**
 * Middleware to process and register route definitions from modules.
 *
 * @param context - The configuration context containing modules and blueprint.
 * @param next - The next pipeline function to continue processing.
 * @returns The updated blueprint or a promise resolving to it.
 *
 * @example
 * ```typescript
 * RouteDefinitionsMiddleware(context, next)
 * ```
 */
export const RouteDefinitionsMiddleware = ({ modules, blueprint }: ConfigContext, next: NextPipe<ConfigContext, IBlueprint>): IBlueprint | Promise<IBlueprint> => {
  (modules as ClassType[])
    .filter(module => hasMetadata(module, GROUP_KEY))
    .forEach(module => {
      const children = getMetadata<ClassType, RouteDefinition[]>(module, MATCH_KEY, [])
      const parent = getMetadata<ClassType, RouteDefinition>(module, GROUP_KEY, { path: '/' })
      parent.children = children
      parent.action = children.length > 0 ? module : { handle: module } // Add fallback action if no children
      blueprint.add('stone.router.definitions', parent)
    })

  return next({ modules, blueprint })
}

/**
 * Middleware to set router commands for Node CLI adapters.
 *
 * @param context - The configuration context containing modules and blueprint.
 * @param next - The next pipeline function to continue processing.
 * @returns The updated blueprint or a promise resolving to it.
 *
 * @example
 * ```typescript
 * SetRouterCommandsMiddleware(context, next)
 * ```
 */
export const SetRouterCommandsMiddleware = ({ modules, blueprint }: ConfigContext, next: NextPipe<ConfigContext, IBlueprint>): IBlueprint | Promise<IBlueprint> => {
  blueprint
    .get<NodeCliAdapterConfig[]>('stone.adapters', [])
    .filter(adapter => adapter.platform === NODE_CONSOLE_PLATFORM)
    .map(adapter => {
      adapter.commands = [
        [RouterCommand, routerCommandOptions] as [ClassType, CommandOptions]
      ].concat(adapter.commands)
      return adapter
    })

  return next({ modules, blueprint })
}

/**
 * Configuration for route processing middleware.
 *
 * This array defines a list of middleware pipes, each with a `pipe` function and a `priority`.
 * These pipes are executed in the order of their priority values, with lower values running first.
 *
 * @example
 * ```typescript
 * const middlewares = routeConfigMiddleware;
 * middlewares.forEach(({ pipe, priority }) => {
 *   // Execute each middleware in order of priority
 * });
 * ```
 */
export const routeConfigMiddleware: MixedPipe[] = [
  { pipe: RouteDefinitionsMiddleware, priority: 3 },
  { pipe: SetRouterCommandsMiddleware, priority: 5 }
]
