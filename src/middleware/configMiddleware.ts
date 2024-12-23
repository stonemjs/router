import { RouteDefinition } from '../declarations'
import { MixedPipe, NextPipe } from '@stone-js/pipeline'
import { GROUP_KEY, MATCH_KEY } from '../decorators/constants'
import { RouterCommand, routerCommandOptions } from '../commands/RouterCommand'
import { ConfigContext, IBlueprint, ClassType, hasMetadata, getMetadata } from '@stone-js/core'
import { CommandOptions, NODE_CONSOLE_PLATFORM, NodeCliAdapterConfig } from '@stone-js/node-cli-adapter'

/**
 * Middleware to process route definitions from configured modules.
 *
 * This middleware extracts route definitions and their children from modules
 * with metadata tagged by `GROUP_KEY` and `MATCH_KEY`. It organizes these
 * definitions into a hierarchy and adds them to the blueprint under the key
 * `stone.router.definitions`.
 *
 * @param {ConfigContext} config - The configuration context containing modules and blueprint.
 * @param {NextPipe<ConfigContext, IBlueprint>} next - The next middleware pipe to execute.
 * @returns {IBlueprint | Promise<IBlueprint>} - The updated blueprint or a promise resolving to it.
 */
export const RouteDefinitionsMiddleware = ({ modules, blueprint }: ConfigContext, next: NextPipe<ConfigContext, IBlueprint>): IBlueprint | Promise<IBlueprint> => {
  (modules as ClassType[])
    .filter(module => typeof module === 'function' && hasMetadata(module, GROUP_KEY))
    .forEach(module => {
      const parent: RouteDefinition = getMetadata(module, GROUP_KEY, { path: '/' })
      const children: RouteDefinition[] = getMetadata(module, MATCH_KEY, [])
      parent.children = children
      parent.action = children.length > 0 ? module : { handle: module } // Add fallback action if no children
      blueprint.add('stone.router.definitions', parent)
    })
  return next({ modules, blueprint })
}

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
