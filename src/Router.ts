import { Route } from './Route'
import { RouteEvent } from './events/RouteEvent'
import { RouterError } from './errors/RouterError'
import { RouteCollection } from './RouteCollection'
import { RouterConfig } from './config/RouterBlueprint'
import { RouteMapper, RouteMapperOptions } from './RouteMapper'
import { RouteNotFoundError } from './errors/RouteNotFoundError'
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from './constants'
import { IBlueprint, IListener, isConstructor, IRouter } from '@stone-js/core'
import { MixedPipe, Pipe, PipeInstance, Pipeline, PipelineOptions } from '@stone-js/pipeline'
import { FunctionalRouteDefinition, IOutgoingResponse, RouterAction, RouteDefinition, RouteParams, RouterContext, NavigateOptions, GenerateOptions, IEventEmitter, IContainer, FunctionalRouteGroupDefinition, HttpMethod, IIncomingHttpEvent, IOutgoingHttpResponse } from './declarations'

export interface RouterOptions {
  blueprint: IBlueprint
  container: IContainer
  eventEmitter?: IEventEmitter
}

export class Router<
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
> implements IRouter<IncomingEventType, OutgoingResponseType> {
  private readonly blueprint: IBlueprint
  private readonly container?: IContainer
  private readonly eventEmitter?: IEventEmitter
  private readonly routeMapper: RouteMapper<IncomingEventType, OutgoingResponseType>

  private groupDefinition?: FunctionalRouteGroupDefinition
  private currentRoute?: Route<IncomingEventType, OutgoingResponseType>

  private routes: RouteCollection<IncomingEventType, OutgoingResponseType>

  static create<
    IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
    OutgoingEventType extends IOutgoingResponse = IOutgoingHttpResponse
  >(options: RouterOptions): Router<IncomingEventType, OutgoingEventType> {
    return new this(options)
  }

  constructor ({ blueprint, container, eventEmitter }: RouterOptions) {
    this.validateBlueprint(blueprint)

    this.container = container
    this.blueprint = blueprint
    this.eventEmitter = eventEmitter

    const routeMapperOptions = this.blueprint.get<RouteMapperOptions>('stone.router')
    const definitions = this.blueprint.get<RouteDefinition[]>('stone.router.definitions', [])

    this.routeMapper = RouteMapper.create<IncomingEventType, OutgoingResponseType>(routeMapperOptions, container)
    this.routes = RouteCollection
      .create<IncomingEventType, OutgoingResponseType>(this.routeMapper.toRoutes(definitions))
      .setOutgoingResponseResolver(routeMapperOptions.responseResolver)
  }

  group (path: string, definition?: Omit<FunctionalRouteGroupDefinition, 'path'>): this {
    this.groupDefinition = { ...definition, path }
    return this
  }

  noGroup (): this {
    this.groupDefinition = undefined
    return this
  }

  options (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefintion, [OPTIONS])
  }

  get (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this
      .match(path, actionOrDefintion, [GET])
      .match(path, { ...actionOrDefintion, isInternalHeader: true }, [HEAD])
  }

  add (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.get(path, actionOrDefintion)
  }

  page (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.get(path, actionOrDefintion)
  }

  post (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefintion, [POST])
  }

  put (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefintion, [PUT])
  }

  patch (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefintion, [PATCH])
  }

  delete (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefintion, [DELETE])
  }

  any (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition): this {
    return this.match(path, actionOrDefintion, [GET, POST, PUT, PATCH, DELETE, OPTIONS])
  }

  fallback (action: RouterAction): this {
    return this.get('/:__fallback__(.*)*', { action, fallback: true })
  }

  match (path: string, actionOrDefintion: RouterAction | FunctionalRouteDefinition, methods: HttpMethod[]): this {
    const child: RouteDefinition = typeof actionOrDefintion === 'function'
      ? { path, action: actionOrDefintion, methods }
      : { ...actionOrDefintion, path, methods }
    const definition = this.groupDefinition === undefined ? child : { ...this.groupDefinition, children: [child] }

    this.blueprint.add('stone.router.definitions', definition)
    this.routeMapper.toRoutes([definition]).forEach((route) => this.routes.add(route))

    return this
  }

  define (definitions: RouteDefinition[]): this {
    this.blueprint.add('stone.router.definitions', definitions)
    this.routeMapper.toRoutes(definitions).forEach((route) => this.routes.add(route))
    return this
  }

  setRoutes (routes: RouteCollection<IncomingEventType, OutgoingResponseType>): this {
    if (!(routes instanceof RouteCollection)) {
      throw new RouterError('Parameter must be an instance of RouteCollection')
    }

    this.routes = routes

    return this
  }

  use (middleware: MixedPipe | MixedPipe[]): this {
    this.blueprint.add('stone.router.middleware', middleware)
    return this
  }

  useOn (name: string | string[], middleware: MixedPipe | MixedPipe[]): this {
    const definitions = this.blueprint.get<RouteDefinition[]>('stone.router.definitions', [])

    Array(name).flat().forEach((name) => {
      definitions
        .filter((v) => v.name === name)
        .forEach((v) => v.middleware = [middleware].flat())
    })

    return this
  }

  on (eventName: string, listener: IListener): this {
    this.eventEmitter?.on(eventName, listener)
    return this
  }

  configure (options: Partial<RouterConfig>): this {
    this.blueprint.add('stone.router', options)
    return this
  }

  async dispatch (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.runRoute(event, this.findRoute(event))
  }

  async respondWithRouteName (event: IncomingEventType, name: string): Promise<OutgoingResponseType> {
    const route = this.routes.getByName(name)

    if (route === undefined) {
      throw new RouteNotFoundError(`No routes found with this name ${name}`)
    }

    return await this.runRoute(event, route)
  }

  findRoute (event: IncomingEventType): Route<IncomingEventType, OutgoingResponseType> {
    this.eventEmitter?.emit(RouteEvent.create({ type: RouteEvent.ROUTING, source: this, metadata: { event } }))

    this.currentRoute = this.routes.match(event)
    this.currentRoute && this.container?.instance(Route, this.currentRoute)?.alias(Route, 'route')

    return this.currentRoute
  }

  generate (options: GenerateOptions): string {
    const route = this.routes.getByName(options.name)

    if (route === undefined) {
      throw new RouteNotFoundError(`No routes found with this name ${String(options.name)}`)
    }

    return route.generate(options)
  }

  navigate (pathOrOptions: string | NavigateOptions): void {
    if (window === undefined) {
      throw new RouterError('This method can only be used in a browser environment')
    }

    let path = pathOrOptions
    const options = pathOrOptions as NavigateOptions

    if (typeof options.name === 'string') {
      path = this.generate({ ...options, withDomain: false })
    }

    this.eventEmitter?.emit(new CustomEvent('@stonejs/router.navigate', { detail: { path, options } }))
  }

  gatherRouteMiddleware (route: Route<IncomingEventType, OutgoingResponseType>): MixedPipe[] {
    const skipMiddleware = this.blueprint.get<boolean>('stone.router.skipMiddleware', false)

    return this.blueprint
      .get<MixedPipe[]>('stone.router.middleware', [])
      .concat(route.getOption('middleware') ?? [])
      .filter(v => !skipMiddleware && v !== undefined && !route.isMiddlewareExcluded(v))
      .reduce<MixedPipe[]>((acc, middleware) => acc.includes(middleware) ? acc : acc.concat(middleware), [])
  }

  hasRoute (name: string | string[]): boolean {
    return [name]
      .flat()
      .filter((v) => this.routes.hasNamedRoute(v))
      .length > 0
  }

  getParameters (): RouteParams | undefined {
    return this.currentRoute?.params
  }

  getParameter<TReturn = unknown>(name: string, fallback?: TReturn): TReturn | undefined {
    return this.currentRoute?.getParam(name, fallback)
  }

  getCurrentRoute (): Route<IncomingEventType, OutgoingResponseType> | undefined {
    return this.currentRoute
  }

  getCurrentRouteName (): string | undefined {
    return this.currentRoute?.getOption('name')
  }

  isCurrentRouteNamed (name: string): boolean {
    return this.getCurrentRouteName() === name
  }

  getRoutes (): RouteCollection<IncomingEventType, OutgoingResponseType> {
    return this.routes
  }

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

  private async bindAndRun (route: Route<IncomingEventType, OutgoingResponseType>, event: IncomingEventType) {
    await route.bind(event)
    return await route.run(event)
  }

  private makePipelineOptions (): PipelineOptions<RouterContext<IncomingEventType, OutgoingResponseType>, OutgoingResponseType> {
    return {
      resolver: (middleware: Pipe) => {
        if (isConstructor(middleware)) {
          return this.container?.resolve<PipeInstance<RouterContext<IncomingEventType, OutgoingResponseType>, OutgoingResponseType>>(middleware, true)
        }
      }
    }
  }

  private validateBlueprint (blueprint: IBlueprint) {
    if (blueprint === undefined) { throw new RouterError('Router blueprint is required to create a Router instance') }
  }
}
