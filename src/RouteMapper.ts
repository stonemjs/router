import { HTTP_METHODS } from './constants'
import { ClassType } from '@stone-js/core'
import { Route, RouteOptions } from './Route'
import { RouterError } from './errors/RouterError'
import { BindingResolver, IBoundModel, IContainer, IDispachers, IIncomingEvent, IMatcher, IOutgoingResponse, OutgoingResponseResolver, RouteDefinition, RouterAction } from './declarations'

/**
 * Configuration options for the RouteMapper.
 */
export interface RouteMapperOptions {
  prefix: string
  strict: boolean
  maxDepth: number
  matchers: IMatcher[]
  dispatchers: IDispachers
  rules: Record<string, RegExp>
  defaults: Record<string, unknown>
  responseResolver?: OutgoingResponseResolver
  bindings: Record<string, IBoundModel | BindingResolver>
}

/**
 * Maps route definitions into concrete `Route` instances.
 *
 * @template IncomingEventType - Represents the type of incoming HTTP events.
 * @template OutgoingResponseType - Represents the type of outgoing HTTP responses.
 */
export class RouteMapper<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> {
  /**
   * Factory method to create a RouteMapper instance.
   *
   * @param options - Configuration options for the RouteMapper.
   * @param container - Optional dependency injection container.
   * @returns A new RouteMapper instance.
   */
  static create<
    IncomingEventType extends IIncomingEvent = IIncomingEvent,
    OutgoingEventType extends IOutgoingResponse = IOutgoingResponse
  >(options: RouteMapperOptions, container?: IContainer): RouteMapper<IncomingEventType, OutgoingEventType> {
    return new this(options, container)
  }

  /**
   * Constructs a RouteMapper instance.
   *
   * @param options - Configuration options for the RouteMapper.
   * @param container - Optional dependency injection container.
   * @throws {RouterError} If `maxDepth` is not a positive integer.
   */
  constructor (
    private readonly options: RouteMapperOptions,
    private readonly container?: IContainer
  ) {
    if (options.maxDepth <= 0) {
      throw new RouterError('Maximum depth must be a positive integer.')
    }
  }

  /**
   * Maps route definitions into Route instances.
   *
   * @param definitions - An array of route definitions.
   * @returns An array of Route instances.
   */
  toRoutes (definitions: RouteDefinition[]): Array<Route<IncomingEventType, OutgoingResponseType>> {
    return this
      .flattenDefinitions(definitions)
      .map((definition) =>
        Route
          .create<IncomingEventType, OutgoingResponseType>(this.toRouteOptions(definition))
          .setOutgoingResponseResolver(this.options.responseResolver)
          .setDispatchers(this.options.dispatchers)
          .setMatchers(this.options.matchers)
          .setContainer(this.container)
      )
  }

  /**
   * Flattens nested route definitions.
   *
   * @param definitions - An array of route definitions.
   * @param depth - Current recursion depth.
   * @returns An array of flattened route definitions.
   * @throws {RouterError} If maximum depth is exceeded.
   */
  private flattenDefinitions (definitions: RouteDefinition[], depth: number = 0): RouteDefinition[] {
    if (depth >= this.options.maxDepth) {
      throw new RouterError(`Maximum route definition depth of ${String(this.options.maxDepth)} exceeded.`)
    }

    depth++

    return definitions
      .flatMap((def) => [def.path].flat().filter(Boolean).map((path) => ({ ...def, path })))
      .flatMap((def) => [def.method, def.methods ?? []].flat().map((method) => ({ ...def, method })))
      .flatMap((def) => [def.protocol].flat().map((protocol) => ({ ...def, protocol })))
      .flatMap((def) => [def.domain].flat().map((domain) => ({ ...def, domain })))
      .flatMap((def) => {
        if (!Array.isArray(def.children)) return def
        return this
          .flattenDefinitions(def.children, depth)
          .map((child) => this.mergeDefinitions(def, child))
      })
  }

  /**
   * Merges parent and child route definitions.
   *
   * @param parent - The parent route definition.
   * @param child - The child route definition.
   * @returns A merged route definition.
   */
  private mergeDefinitions (parent: RouteDefinition, child: RouteDefinition): RouteDefinition {
    child.domain ??= parent.domain
    child.method ??= parent.method
    child.strict ??= parent.strict
    child.protocol ??= parent.protocol
    child.redirect ??= parent.redirect
    child.rules = { ...parent.rules, ...child.rules }
    child.action = this.mergeDefinitionsAction(parent, child)
    child.defaults = { ...parent.defaults, ...child.defaults }
    child.bindings = { ...parent.bindings, ...child.bindings }
    child.name = [parent.name, child.name].filter(Boolean).join('.')
    child.path = ['/', parent.path, child.path].filter(Boolean).join('/')
    child.middleware = [child.middleware, parent.middleware].flat().filter((v) => v !== undefined)
    child.excludeMiddleware = [child.excludeMiddleware, parent.excludeMiddleware].flat().filter((v) => v !== undefined)

    return child
  }

  /**
   * Merges parent and child route actions.
   *
   * @param parent - The parent route definition.
   * @param child - The child route definition.
   * @returns A merged route action.
   */
  private mergeDefinitionsAction (parent: RouteDefinition, child: RouteDefinition): RouterAction | undefined {
    if (parent.action !== undefined && child.action !== undefined) {
      if (typeof child.action === 'string' && typeof parent.action === 'function') {
        return { [child.action]: parent.action as ClassType }
      } else {
        return child.action
      }
    } else {
      return child.action
    }
  }

  /**
   * Convert and validates a route option.
   *
   * @param definition - The route definition to validate.
   * @returns The validated route options.
   * @throws {RouterError} If validation fails.
   */
  private toRouteOptions (definition: RouteDefinition): RouteOptions {
    if (definition.path === undefined) {
      throw new RouterError(`Route definition is missing 'path': ${JSON.stringify(definition)}`)
    }
    if (definition.action === undefined) {
      throw new RouterError(`Route definition is missing 'action': ${JSON.stringify(definition)}`)
    }
    if (definition.method === undefined || !HTTP_METHODS.includes(definition.method)) {
      throw new RouterError(`Invalid method(${String(definition.method)}), valid methods are(${String(HTTP_METHODS.join(','))})`)
    }

    return {
      ...definition as RouteOptions,
      strict: definition.strict ?? this.options.strict,
      rules: { ...this.options.rules, ...definition.rules },
      bindings: { ...this.options.bindings, ...definition.bindings },
      defaults: { ...this.options.defaults, ...definition.defaults },
      name: definition.name?.replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, ''),
      path: ['/', this.options.prefix, definition.path].filter(Boolean).join('/').replace(/\/{2,}/g, '/')
    }
  }
}
