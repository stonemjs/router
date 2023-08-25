import { Route } from './Route'
import { RouteEvent } from './events/RouteEvent'
import { RouterError } from './errors/RouterError'
import { RouteCollection } from './RouteCollection'
import { RouterConfig } from './options/RouterBlueprint'
import { RouteMapper, RouteMapperOptions } from './RouteMapper'
import { RouteNotFoundError } from './errors/RouteNotFoundError'
import { IBlueprint, IListener, isConstructor, IRouter } from '@stone-js/core'
import { DELETE, GET, HEAD, NAVIGATION_EVENT, OPTIONS, PATCH, POST, PUT } from './constants'
import { MixedPipe, Pipe, PipeInstance, Pipeline, PipelineOptions } from '@stone-js/pipeline'
import { FunctionalRouteDefinition, RouterAction, RouteDefinition, RouteParams, RouterContext, NavigateOptions, GenerateOptions, IEventEmitter, IContainer, FunctionalRouteGroupDefinition, HttpMethod, IIncomingEvent, IOutgoingResponse, OutgoingResponseResolver } from './declarations'

export interface RouterOptions {
  blueprint: IBlueprint
  container: IContainer
  eventEmitter?: IEventEmitter
}

/**
 * Represents a configurable router for managing HTTP routes and handling incoming events.
 *
 * @template IncomingEventType - Type of incoming events.
 * @template OutgoingResponseType - Type of outgoing responses.
 */
export class Router<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> implements IRouter<IncomingEventType, OutgoingResponseType> {
  private readonly blueprint: IBlueprint
  private readonly container?: IContainer
  private readonly eventEmitter?: IEventEmitter
  private readonly routeMapper: RouteMapper<IncomingEventType, OutgoingResponseType>

  private groupDefinition?: FunctionalRouteGroupDefinition
  private currentRoute?: Route<IncomingEventType, OutgoingResponseType>

  private routes: RouteCollection<IncomingEventType, OutgoingResponseType>

  /**
   * Factory method for creating a router instance.
   *
   * @param options - Configuration options for the router.
   * @returns A new `Router` instance.
   */
  static create<
    IncomingEventType extends IIncomingEvent = IIncomingEvent,
    OutgoingEventType extends IOutgoingResponse = IOutgoingResponse
  >(options: RouterOptions): Router<IncomingEventType, OutgoingEventType> {
    return new this(options)
  }

  /**
   * Constructs a `Router` instance.
   *
   * @param options - The router options including blueprint, container, and event emitter.
   * @throws {RouterError} If the blueprint is invalid.
   */
  protected constructor ({ blueprint, container, eventEmitter }: RouterOptions) {
    this.validateBlueprint(blueprint)

    this.blueprint = blueprint
    this.container = container
    this.eventEmitter = eventEmitter

    const definitions = this.blueprint.get<RouteDefinition[]>(
      'stone.router.definitions',
      []
    )
    const routeMapperOptions = this.blueprint.get<RouteMapperOptions>(
      'stone.router',
      {} as unknown as RouteMapperOptions
    )

    this.routeMapper = RouteMapper.create<IncomingEventType, OutgoingResponseType>(
      routeMapperOptions,
      container
    )

    this.routes = RouteCollection.create<IncomingEventType, OutgoingResponseType>(
      this.routeMapper.toRoutes(definitions)
    ).setOutgoingResponseResolver(routeMapperOptions.responseResolver)
  }

  /**
   * Creates a route group.
   *
   * @param path - The base path for the group.
   * @param definition - Optional group-specific route definitions.
   * @returns The router instance for chaining.
   */
  group (path: string, definition?: Omit<FunctionalRouteGroupDefinition, 'path'>): this {
    this.groupDefinition = { ...definition, path }
    return this
  }

  /**
   * Removes the current group definition, ending the grouping context.
   *
   * @returns The router instance for chaining.
   */
  noGroup (): this {
    this.groupDefinition = undefined
    return this
  }

  /**
   * Registers a route that supports the `OPTIONS` method.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  options (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefinition, [OPTIONS])
  }

  /**
   * Registers a route that supports the `GET` and `HEAD` methods.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  get (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    const definition = typeof actionOrDefinition === 'object'
      ? actionOrDefinition
      : { action: actionOrDefinition }

    return this
      .match(path, actionOrDefinition, [GET])
      .match(path, { ...definition, isInternalHeader: true }, [HEAD])
  }

  /**
   * Registers a route that supports the `GET` and `HEAD` methods.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  add (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.get(path, actionOrDefinition)
  }

  /**
   * Registers a route that supports the `GET` and `HEAD` methods.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  page (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.get(path, actionOrDefinition)
  }

  /**
   * Registers a route that supports the `POST` method.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  post (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefinition, [POST])
  }

  /**
   * Registers a route that supports the `PUT` method.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  put (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefinition, [PUT])
  }

  /**
   * Registers a route that supports the `PATCH` method.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  patch (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefinition, [PATCH])
  }

  /**
   * Registers a route that supports the `DELETE` method.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  delete (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefinition, [DELETE])
  }

  /**
   * Registers a route that supports all HTTP methods.
   *
   * @param path - The route path.
   * @param actionOrDefinition - The route action or functional definition.
   * @returns The router instance for chaining.
   */
  any (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefinition, [GET, POST, PUT, PATCH, DELETE, OPTIONS])
  }

  /**
   * Registers a fallback route to handle unmatched requests.
   *
   * @param action - The action to execute for the fallback route.
   * @returns The current `Router` instance.
   */
  fallback (action: RouterAction): this {
    return this.get('/:__fallback__(.*)*', { action, fallback: true })
  }

  /**
   * Adds a route to the router for specific HTTP methods.
   *
   * @param path - The path for the route.
   * @param actionOrDefinition - The action to execute or a route definition object.
   * @param methods - An array of HTTP methods this route should handle.
   * @returns The current `Router` instance.
   */
  match (path: string, actionOrDefinition: RouterAction | FunctionalRouteDefinition, methods: HttpMethod[]): this {
    const child: RouteDefinition = typeof actionOrDefinition === 'object'
      ? { ...actionOrDefinition, path, methods }
      : { path, action: actionOrDefinition, methods }
    const definition = this.groupDefinition === undefined ? child : { ...this.groupDefinition, children: [child] }

    this.blueprint.add('stone.router.definitions', definition)
    this.routeMapper.toRoutes([definition]).forEach((route) => this.routes.add(route))

    return this
  }

  /**
   * Defines multiple route definitions in the router.
   *
   * @param definitions - An array of route definitions to add.
   * @returns The current `Router` instance.
   */
  define (definitions: RouteDefinition[]): this {
    this.blueprint.add('stone.router.definitions', definitions)
    this.routeMapper.toRoutes(definitions).forEach((route) => this.routes.add(route))
    return this
  }

  /**
   * Sets the routes for the router using a `RouteCollection`.
   *
   * @param routes - The `RouteCollection` instance containing routes to set.
   * @returns The current `Router` instance.
   * @throws {RouterError} If the provided parameter is not an instance of `RouteCollection`.
   */
  setRoutes (routes: RouteCollection<IncomingEventType, OutgoingResponseType>): this {
    if (!(routes instanceof RouteCollection)) {
      throw new RouterError('Parameter must be an instance of RouteCollection')
    }

    this.routes = routes.setOutgoingResponseResolver(this.blueprint.get<OutgoingResponseResolver>('stone.router.responseResolver'))

    return this
  }

  /**
   * Configures the router with specific options.
   *
   * @param options - A partial configuration object for the router.
   * @returns The current `Router` instance.
   */
  configure (options: Partial<RouterConfig>): this {
    this.blueprint.add('stone.router', options)
    return this
  }

  /**
   * Adds global middleware to the router.
   *
   * @param middleware - A single middleware or an array of middleware to add.
   * @returns The current `Router` instance.
   */
  use (middleware: MixedPipe | MixedPipe[]): this {
    this.blueprint.add('stone.router.middleware', middleware)
    return this
  }

  /**
   * Attaches middleware to specific routes by their name.
   *
   * @param name - A single route name or an array of route names to attach the middleware to.
   * @param middleware - A single middleware or an array of middleware to attach.
   * @returns The current `Router` instance.
   */
  useOn (name: string | string[], middleware: MixedPipe | MixedPipe[]): this {
    const definitions = this.blueprint.get<RouteDefinition[]>('stone.router.definitions', [])

    Array(name).flat().forEach((name) => {
      definitions
        .filter((v) => v.name === name)
        .forEach((v) => { v.middleware = [middleware].flat() })
    })

    return this
  }

  /**
   * Subscribes to an event emitted by the router's event emitter.
   *
   * @param eventName - The name of the event to listen for.
   * @param listener - The listener function to execute when the event is emitted.
   * @returns The current `Router` instance.
   */
  on (eventName: string, listener: IListener): this {
    this.eventEmitter?.on(eventName, listener)
    return this
  }

  /**
   * Dispatches an event through the router to find and execute the corresponding route.
   *
   * @param event - The incoming event to process.
   * @returns A promise resolving to the outgoing response after executing the matched route.
   */
  async dispatch (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.runRoute(event, this.findRoute(event))
  }

  /**
   * Dispatches an event to a specific route by its name.
   *
   * @param event - The incoming event to process.
   * @param name - The name of the route to execute.
   * @returns A promise resolving to the outgoing response after executing the specified route.
   * @throws {RouteNotFoundError} If no route is found with the given name.
   */
  async respondWithRouteName (event: IncomingEventType, name: string): Promise<OutgoingResponseType> {
    const route = this.routes.getByName(name)

    if (route === undefined) {
      throw new RouteNotFoundError(`No routes found with this name ${name}`)
    }

    return await this.runRoute(event, route)
  }

  /**
   * Finds and matches a route for the given event.
   *
   * @param event - The incoming event to find a route for.
   * @returns The matched route.
   * @throws {RouteNotFoundError} If no route matches the given event.
   */
  findRoute (event: IncomingEventType): Route<IncomingEventType, OutgoingResponseType> {
    this.eventEmitter?.emit(
      RouteEvent.create({ type: RouteEvent.ROUTING, source: this, metadata: { event } })
    )

    this.currentRoute = this.routes.match(event)
    this.currentRoute !== undefined && this.container?.instance(Route, this.currentRoute)?.alias(Route, 'route')

    return this.currentRoute
  }

  /**
   * Generates a URL based on a named route and the provided options.
   *
   * @param options - Options for generating the URL, including the route name, parameters, and query.
   * @returns The generated URL as a string.
   * @throws {RouteNotFoundError} If no route is found with the specified name.
   */
  generate (options: GenerateOptions): string {
    const route = this.routes.getByName(options.name)

    if (route === undefined) {
      throw new RouteNotFoundError(`No routes found with this name ${String(options.name)}`)
    }

    return route.generate(options)
  }

  /**
   * Navigates to a specific route in the browser environment.
   *
   * @param pathOrOptions - The path or navigation options, including route name and parameters.
   * @throws {RouterError} If called outside a browser environment.
   */
  navigate (pathOrOptions: string | NavigateOptions): void {
    if (window === undefined) {
      throw new RouterError('This method can only be used in a browser environment')
    }

    let path = pathOrOptions as string
    const options = pathOrOptions as NavigateOptions

    if (typeof options.name === 'string') {
      path = this.generate({ ...options, withDomain: false })
    }

    window.history.pushState({ path, options }, '', path)
    window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: { path, options } }))
  }

  /**
   * Collects middleware for a specific route, including global and route-specific middleware.
   *
   * @param route - The route for which middleware should be gathered.
   * @returns An array of middleware to execute for the route.
   */
  gatherRouteMiddleware (route: Route<IncomingEventType, OutgoingResponseType>): MixedPipe[] {
    const skipMiddleware = this.blueprint.get<boolean>('stone.router.skipMiddleware', false)

    return this.blueprint
      .get<MixedPipe[]>('stone.router.middleware', [])
      .concat(route.getOption('middleware', []))
      .filter((v) => !skipMiddleware && v !== undefined && !route.isMiddlewareExcluded(v))
      .reduce<MixedPipe[]>((acc, middleware) => (acc.includes(middleware) ? acc : acc.concat(middleware)), [])
  }

  /**
   * Checks if the router contains a route with the given name(s).
   *
   * @param name - A route name or an array of route names to check.
   * @returns `true` if at least one of the specified routes exists, `false` otherwise.
   */
  hasRoute (name: string | string[]): boolean {
    return [name]
      .flat()
      .filter((v) => this.routes.hasNamedRoute(v))
      .length > 0
  }

  /**
   * Retrieves the parameters of the current route.
   *
   * @returns An object containing the parameters of the current route, or `undefined` if no route is active.
   */
  getParameters (): RouteParams | undefined {
    return this.currentRoute?.params
  }

  /**
   * Retrieves a specific parameter from the current route.
   *
   * @template TReturn - The expected return type of the parameter.
   * @param name - The name of the parameter to retrieve.
   * @param fallback - An optional fallback value to return if the parameter is not found.
   * @returns The value of the parameter, or the fallback value if the parameter is not found.
   */
  getParameter<TReturn = unknown>(name: string, fallback?: TReturn): TReturn | undefined {
    return this.currentRoute?.getParam(name, fallback)
  }

  /**
   * Retrieves the currently active route.
   *
   * @returns The current route, or `undefined` if no route is active.
   */
  getCurrentRoute (): Route<IncomingEventType, OutgoingResponseType> | undefined {
    return this.currentRoute
  }

  /**
   * Retrieves the name of the currently active route.
   *
   * @returns The name of the current route, or `undefined` if no route is active.
   */
  getCurrentRouteName (): string | undefined {
    return this.currentRoute?.getOption('name')
  }

  /**
   * Checks if the currently active route matches the specified name.
   *
   * @param name - The name to compare with the current route's name.
   * @returns `true` if the current route's name matches the specified name, `false` otherwise.
   */
  isCurrentRouteNamed (name: string): boolean {
    return this.getCurrentRouteName() === name
  }

  /**
   * Retrieves the collection of all routes in the router.
   *
   * @returns A `RouteCollection` containing all registered routes.
   */
  getRoutes (): RouteCollection<IncomingEventType, OutgoingResponseType> {
    return this.routes
  }

  /**
   * Dumps all routes as an array of JSON objects.
   *
   * @returns An array of JSON objects representing the routes.
   */
  dumpRoutes (): Array<Record<string, unknown>> {
    return this.routes.dump()
  }

  private async runRoute (event: IncomingEventType, route: Route<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> {
    event.setRouteResolver?.(() => route)
    this.eventEmitter?.emit(RouteEvent.create({ type: RouteEvent.ROUTE_MATCHED, source: this, metadata: { event, route } }))
    return await this.runRouteWithMiddleware(event, route)
  }

  private async runRouteWithMiddleware (event: IncomingEventType, route: Route<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> {
    return await Pipeline
      .create<RouterContext<IncomingEventType, OutgoingResponseType>, OutgoingResponseType>(this.makePipelineOptions())
      .send({ event, route })
      .through(this.gatherRouteMiddleware(route))
      .then(async (v) => await this.bindAndRun(v.route, v.event))
  }

  private async bindAndRun (route: Route<IncomingEventType, OutgoingResponseType>, event: IncomingEventType): Promise<OutgoingResponseType> {
    await route.bind(event)
    return await route.run(event)
  }

  private makePipelineOptions (): PipelineOptions<RouterContext<IncomingEventType, OutgoingResponseType>, OutgoingResponseType> {
    return {
      resolver: (middleware: Pipe) => {
        if (isConstructor(middleware) || this.container?.has(middleware) === true) {
          return this.container?.resolve<PipeInstance<RouterContext<IncomingEventType, OutgoingResponseType>, OutgoingResponseType>>(middleware, true)
        }
      }
    }
  }

  private validateBlueprint (blueprint: IBlueprint): void {
    if (blueprint === undefined) { throw new RouterError('Router blueprint is required to create a Router instance') }
  }
}
