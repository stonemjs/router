import { Route } from './Route'
import { HTTP_METHODS } from './constants'
import { RouterError } from './errors/RouterError'
import { OutgoingResponseOptions } from '@stone-js/core'
import { RouteNotFoundError } from './errors/RouteNotFoundError'
import { MethodNotAllowedError } from './errors/MethodNotAllowedError'
import { IIncomingEvent, IOutgoingResponse, OutgoingResponseResolver, RouterCallableAction } from './declarations'

/**
 * Manages a collection of `Route` instances.
 *
 * @template IncomingEventType - The type of incoming HTTP events.
 * @template OutgoingResponseType - The type of outgoing HTTP responses.
 */
export class RouteCollection<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> {
  /**
   * The resolver for generating outgoing responses.
   */
  private outgoingResponseResolver?: OutgoingResponseResolver

  /**
   * A map of all routes using a unique key combining method and path.
   */
  private readonly routes: Map<string, Route<IncomingEventType, OutgoingResponseType>> = new Map()

  /**
   * A map of named routes for quick lookup by name.
   */
  private readonly nameList: Map<string, Route<IncomingEventType, OutgoingResponseType>> = new Map()

  /**
   * A map of routes grouped by HTTP methods.
   */
  private readonly methodList: Map<string, Map<string, Route<IncomingEventType, OutgoingResponseType>>> = new Map()

  /**
   * Factory method to create a `RouteCollection` instance.
   *
   * @param routes - Optional array of `Route` instances to initialize the collection.
   * @returns A new `RouteCollection` instance.
   */
  static create<
    IncomingEventType extends IIncomingEvent = IIncomingEvent,
    OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
  >(routes?: Array<Route<IncomingEventType, OutgoingResponseType>>): RouteCollection<IncomingEventType, OutgoingResponseType> {
    return new this(routes)
  }

  /**
   * Constructs a `RouteCollection` instance.
   *
   * @param routes - Optional array of `Route` instances to initialize the collection.
   */
  constructor (routes?: Array<Route<IncomingEventType, OutgoingResponseType>>) {
    if (Array.isArray(routes)) {
      routes.forEach((route) => this.add(route))
    }
  }

  /**
   * Retrieves the total number of routes in the collection.
   */
  public get size (): number {
    return this.getRoutes().length
  }

  /**
   * Adds a `Route` to the collection.
   *
   * @param route - The `Route` to add.
   * @returns The updated `RouteCollection` instance.
   */
  public add (route: Route<IncomingEventType, OutgoingResponseType>): this {
    this.addToCollections(route)
    this.addToMethodList(route)
    this.addToNameList(route)
    return this
  }

  /**
   * Matches a `Route` based on an incoming event.
   *
   * @param event - The incoming HTTP event.
   * @param includingMethod - Whether to consider the HTTP method during matching. Defaults to `true`.
   * @returns The matched `Route`.
   * @throws {RouteNotFoundError} If no route matches the event.
   */
  public match (event: IncomingEventType, includingMethod: boolean = true): Route<IncomingEventType, OutgoingResponseType> {
    const routes = this.getRoutesByMethod(event.method)
    const route = this.matchAgainstRoutes(routes, event, includingMethod)
    return this.handleMatchedRoute(event, route)
  }

  /**
   * Checks if a named route exists.
   *
   * @param name - The name of the route.
   * @returns `true` if the named route exists, `false` otherwise.
   */
  public hasNamedRoute (name: string): boolean {
    return this.nameList.has(name)
  }

  /**
   * Retrieves a route by name.
   *
   * @param name - The name of the route.
   * @returns The corresponding `Route`, or `undefined` if not found.
   */
  public getByName (name: string): Route<IncomingEventType, OutgoingResponseType> | undefined {
    return this.nameList.get(name)
  }

  /**
   * Retrieves all routes for a given HTTP method.
   *
   * @param method - The HTTP method.
   * @returns An array of matching routes.
   */
  public getRoutesByMethod (method: string): Array<Route<IncomingEventType, OutgoingResponseType>> {
    return Array.from(this.methodList.get(method.toUpperCase())?.values() ?? [])
  }

  /**
   * Retrieves all registered routes as an array.
   *
   * @returns An array of all routes.
   */
  public getRoutes (): Array<Route<IncomingEventType, OutgoingResponseType>> {
    return Array.from(this.routes.values())
  }

  /**
   * Sets the outgoing response resolver.
   *
   * @param resolver - The resolver to set.
   * @returns The RouteCollection instance.
   */
  public setOutgoingResponseResolver (resolver?: OutgoingResponseResolver): this {
    this.outgoingResponseResolver = resolver
    return this
  }

  /**
   * Dumps all routes as an array of JSON objects.
   *
   * @returns An array of route definitions.
   */
  public dump (): Array<Record<string, unknown>> {
    return Array
      .from(this.methodList.entries())
      .reduce<Array<Record<string, string>>>((prev, [method, routeMap]) => {
      return prev.concat(
        Array
          .from(routeMap.values())
          .filter(route => !(method === 'HEAD' && route.getOption<boolean>('isInternalHeader', false)))
          .map(route => ({ ...route.toJSON(), method }))
      )
    }, [])
      .sort((a, b) => a.path?.localeCompare(b.path))
  }

  /**
   * Converts all routes to a JSON string.
   *
   * @returns A JSON string representing all routes.
   */
  public toString (): string {
    return JSON.stringify(this.dump())
  }

  /**
   * Implements the iterable protocol for iterating over routes.
   *
   * @returns An iterator for the routes.
   */
  public [Symbol.iterator] (): Iterator<Route<IncomingEventType, OutgoingResponseType>> {
    let index = -1
    const routes = this.getRoutes()

    return {
      next: (): IteratorResult<Route<IncomingEventType, OutgoingResponseType>> => ({
        value: routes[++index],
        done: !(index in routes)
      })
    }
  }

  private addToCollections (route: Route<IncomingEventType, OutgoingResponseType>): void {
    this.routes.set(`${String(route.getOption('method'))}.${String(route.getOption('path'))}`, route)
  }

  private addToMethodList (route: Route<IncomingEventType, OutgoingResponseType>): void {
    const path = route.getOption<string>('path')
    const method = route.getOption<string>('method')

    if (method !== undefined && path !== undefined) {
      !this.methodList.has(method) && this.methodList.set(method, new Map())
      this.methodList.get(method)?.set(path, route)
    }
  }

  private addToNameList (route: Route<IncomingEventType, OutgoingResponseType>): void {
    const name = route.getOption<string>('name')
    name !== undefined && this.nameList.set(name, route)
  }

  private matchAgainstRoutes (
    routes: Array<Route<IncomingEventType, OutgoingResponseType>>,
    event: IncomingEventType,
    includingMethod: boolean
  ): Route<IncomingEventType, OutgoingResponseType> | undefined {
    return routes
      .sort((a, b) => Number(a.getOption<boolean>('fallback')) - Number(b.getOption<boolean>('fallback')))
      .find(route => route.matches(event, includingMethod))
  }

  private handleMatchedRoute (event: IncomingEventType, route?: Route<IncomingEventType, OutgoingResponseType>): Route<IncomingEventType, OutgoingResponseType> {
    if (route !== undefined) return route

    const others = this.checkForAlternateVerbs(event)

    if (others.length > 0) return this.getRouteForMethods(event, others)

    throw new RouteNotFoundError(`Route ${String(event.decodedPathname)} could not be found.`)
  }

  private checkForAlternateVerbs (event: IncomingEventType): string[] {
    return HTTP_METHODS.filter(
      method =>
        method.toUpperCase() !== event.method?.toUpperCase() &&
        this.matchAgainstRoutes(this.getRoutesByMethod(method), event, false) !== undefined
    )
  }

  private getRouteForMethods (event: IncomingEventType, methods: string[]): Route<IncomingEventType, OutgoingResponseType> {
    if (event.isMethod?.('OPTIONS')) {
      return Route.create<IncomingEventType, OutgoingResponseType>({
        method: 'OPTIONS',
        path: event.decodedPathname ?? event.pathname,
        action: this.makeRouteAction({
          statusText: '',
          statusCode: 200,
          content: { Allow: methods.join(',') }
        })
      })
    }

    throw new MethodNotAllowedError(`Method ${String(event.method)} is not supported for ${String(event.decodedPathname)}. Supported methods: ${String(methods.join(', '))}.`)
  }

  private makeRouteAction<OptionsType extends OutgoingResponseOptions>(options: OptionsType): RouterCallableAction {
    return async () => {
      if (typeof this.outgoingResponseResolver === 'function') {
        return await this.outgoingResponseResolver(options)
      } else {
        throw new RouterError('Outgoing response resolver is not set.')
      }
    }
  }
}
