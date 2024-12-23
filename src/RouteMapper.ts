import { HTTP_METHODS } from './constants'
import { Route, RouteOptions } from './Route'
import { RouterError } from './errors/RouterError'
import { FlattenedRouteDefinition, IContainer, IDispachers, IIncomingHttpEvent, IMatcher, IOutgoingHttpResponse, IOutgoingResponse, OutgoingResponseResolver, RouteDefinition, RouterAction, RouterClassAction } from './declarations'

export interface RouteMapperOptions {
  prefix: string
  strict: boolean
  maxDepth: number
  matchers: IMatcher[]
  dispatchers: IDispachers
  rules: Record<string, RegExp>
  defaults: Record<string, unknown>
  bindings: Record<string, Function>
  responseResolver?: OutgoingResponseResolver
}

export class RouteMapper<
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
> {
  static create<
    IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
    OutgoingEventType extends IOutgoingResponse = IOutgoingHttpResponse
  >(options: RouteMapperOptions, container?: IContainer): RouteMapper<IncomingEventType, OutgoingEventType> {
    return new this(options, container)
  }

  constructor (
    private readonly options: RouteMapperOptions,
    private readonly container?: IContainer
  ) {
    if (options.maxDepth <= 0) {
      throw new RouterError('Maximum depth must be a positive integer.')
    }
  }

  toRoutes (definitions: RouteDefinition[]): Array<Route<IncomingEventType, OutgoingResponseType>> {
    return this
      .toRouteOptions(this.flattenDefinitions(definitions))
      .map((options) =>
        Route
          .create<IncomingEventType, OutgoingResponseType>(options)
          .setOutgoingResponseResolver(this.options.responseResolver)
          .setDispatchers(this.options.dispatchers)
          .setMatchers(this.options.matchers)
          .setContainer(this.container)
      )
  }

  private toRouteOptions (definitions: FlattenedRouteDefinition[]): RouteOptions[] {
    return definitions
      .reduce<RouteOptions[]>((acc, definition) => this.toRouteOption(acc, definition, definition.children), [])
      .map((routeOptions) => this.validate(routeOptions))
  }

  private toRouteOption (routeOptions: RouteOptions[], definition: FlattenedRouteDefinition, children?: FlattenedRouteDefinition[]): RouteOptions[] {
    if (definition.action !== undefined && children === undefined) {
      routeOptions.push(definition as RouteOptions)
    }

    children?.forEach((child) => {
      this.toRouteOption(routeOptions, this.mergeDefinitions(definition, child), child.children)
    })

    return routeOptions
  }

  private flattenDefinitions (definitions: RouteDefinition[], depth: number = 0): FlattenedRouteDefinition[] {
    if (depth >= this.options.maxDepth) {
      throw new RouterError(`Maximum route definition depth of ${String(this.options.maxDepth)} exceeded.`)
    }

    return definitions.reduce<FlattenedRouteDefinition[]>((acc, definition) => {
      return [definition.path]
        .flat()
        .filter(Boolean)
        .map((path) => ({ ...definition, path })) // Flatten path
        .reduce<RouteDefinition[]>((prev, def) => {
        return [def.method, def.methods].flat().filter(Boolean).flatMap((method) => prev.concat({ ...def, method })) // Flatten methods
      }, [])
        .reduce<RouteDefinition[]>((prev, def) => {
        return [def.protocol].flat().filter(Boolean).flatMap((protocol) => prev.concat({ ...def, protocol })) // Flatten protocol
      }, [])
        .reduce<RouteDefinition[]>((prev, def) => {
        return [def.domain].flat().filter(Boolean).flatMap((domain) => prev.concat({ ...def, domain })) // Flatten domain
      }, [])
        .map((def) => {
          if (Array.isArray(def.children)) {
            def.children = this.flattenDefinitions(def.children, (depth + 1)) // Recurse flatten children
          }
          return def
        })
        .concat(acc) as FlattenedRouteDefinition[]
    }, [])
  }

  private mergeDefinitions (parent: FlattenedRouteDefinition, child: FlattenedRouteDefinition): FlattenedRouteDefinition {
    child.domain ??= parent.domain
    child.method ??= parent.method
    child.strict ??= parent.strict
    child.protocol ??= parent.protocol
    child.redirect ??= parent.redirect
    child.rules = { ...parent.rules, ...child.rules }
    child.action = this.mergeDefinitionsAction(parent, child)
    child.defaults = { ...parent.defaults, ...child.defaults }
    child.bindings = { ...parent.bindings, ...child.bindings }
    child.path = ['/', parent.path, child.path].filter(Boolean).join('/').replace(/\/{2,}/g, '/')
    child.middleware = [child.middleware, parent.middleware].flat().filter((v) => v !== undefined)
    child.name = [parent.name, child.name].filter(Boolean).join('.').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '')
    child.excludeMiddleware = [child.excludeMiddleware, parent.excludeMiddleware].flat().filter((v) => v !== undefined)

    return child
  }

  private mergeDefinitionsAction (parent: FlattenedRouteDefinition, child: FlattenedRouteDefinition): RouterAction | undefined {
    if (parent.action !== undefined && child.action === undefined) {
      return parent.action
    } else if (parent.action !== undefined && child.action !== undefined) {
      if (typeof child.action === 'string' && typeof parent.action === 'function') {
        return { [child.action]: parent.action } as RouterClassAction
      } else {
        return child.action
      }
    } else {
      return child.action
    }
  }

  private validate (routeOptions: RouteOptions): RouteOptions {
    if (routeOptions.path === undefined) {
      throw new RouterError(`Route definition is missing 'path': ${JSON.stringify(routeOptions)}`)
    }
    if (routeOptions.method === undefined) {
      throw new RouterError(`Route definition is missing 'method': ${JSON.stringify(routeOptions)}`)
    }
    if (routeOptions.action === undefined) {
      throw new RouterError(`Route definition is missing 'action': ${JSON.stringify(routeOptions)}`)
    }
    if (!HTTP_METHODS.includes(routeOptions.method)) {
      throw new RouterError(`Invalid method(${String(routeOptions.method)}), valid methods are(${String(HTTP_METHODS.join(','))})`)
    }

    return {
      ...routeOptions,
      strict: routeOptions.strict ?? this.options.strict,
      rules: { ...this.options.rules, ...routeOptions.rules },
      bindings: { ...this.options.bindings, ...routeOptions.bindings },
      defaults: { ...this.options.defaults, ...routeOptions.defaults },
      path: ['/', this.options.prefix, routeOptions.path].filter(Boolean).join('/').replace('//', '/')
    }
  }
}
