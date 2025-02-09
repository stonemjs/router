import { methodMatcher } from './matchers'
import { RouterError } from './errors/RouterError'
import { RouteNotFoundError } from './errors/RouteNotFoundError'
import { isFunctionPipe, MetaPipe, MixedPipe } from '@stone-js/pipeline'
import { isMetaComponentModule, uriConstraints, uriRegex } from './utils'
import { isFunctionModule, isMetaClassModule, isMetaFactoryModule, isMetaFunctionModule, isNotEmpty, isObjectLikeModule, Promiseable } from '@stone-js/core'
import {
  IMatcher,
  BindingKey,
  IDispacher,
  HttpMethod,
  IBoundModel,
  IDispachers,
  RouteParams,
  BindingValue,
  IEventHandler,
  IIncomingEvent,
  RouteDefinition,
  GenerateOptions,
  MetaEventHandler,
  EventHandlerClass,
  DependencyResolver,
  FactoryEventHandler,
  FunctionalEventHandler,
  RouteSegmentConstraint,
  MetaComponentEventHandler,
  LazyComponentEventHandler
} from './declarations'

/**
 * Defines the options for creating a `Route` instance.
 */
export interface RouteOptions<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType = unknown
> extends RouteDefinition<IncomingEventType, OutgoingResponseType> {
  path: string
  domain?: string
  methods?: never
  children?: never
  protocol?: string
  method: HttpMethod
}

/**
 * Represents a route that defines how incoming events are handled.
 *
 * @template IncomingEventType - The type of the incoming event.
 * @template OutgoingResponseType - The type of the outgoing response.
 */
export class Route<IncomingEventType extends IIncomingEvent = IIncomingEvent, OutgoingResponseType = unknown> {
  private eventUrl?: URL
  private routeParams?: RouteParams
  private resolver?: DependencyResolver
  private eventQuery?: Record<string, string>
  private matchers: Array<IMatcher<IncomingEventType, OutgoingResponseType>>
  private dispatchers?: IDispachers<IncomingEventType, OutgoingResponseType>

  private readonly uriConstraints: Array<Partial<RouteSegmentConstraint>>

  /**
   * Factory method for creating a route instance.
   *
   * @param options - Configuration options for the route.
   * @returns A new `Route` instance.
   */
  static create<
    IncomingEventType extends IIncomingEvent = IIncomingEvent,
    OutgoingResponseType = unknown
  >(options: RouteOptions<IncomingEventType, OutgoingResponseType>): Route<IncomingEventType, OutgoingResponseType> {
    return new this(options)
  }

  /**
   * Creates a new `Route` instance.
   *
   * @param options - Configuration options for the route.
   * @returns A new `Route` instance.
   */
  constructor (public readonly options: RouteOptions<IncomingEventType, OutgoingResponseType>) {
    this.validateOptions(options)

    this.matchers = []
    this.uriConstraints = uriConstraints(options)
  }

  /**
   * Gets the parameters extracted from the route.
   *
   * @throws {RouterError} If the event is not bound.
   * @returns The route parameters.
   */
  get params (): RouteParams {
    if (this.routeParams !== undefined) {
      return this.routeParams
    } else {
      throw new RouterError('Event is not bound')
    }
  }

  /**
   * Gets the URL of the event.
   *
   * @returns The event URL or a default URL (`http://localhost`).
   */
  get url (): URL {
    return this.eventUrl ?? new URL('http://localhost')
  }

  /**
   * Gets the full URI of the route.
   *
   * @returns The full URI as a string.
   */
  get uri (): string {
    return this.url.href
  }

  /**
   * Gets the pathname of the route.
   *
   * @returns The pathname as a string.
   */
  get path (): string {
    return this.url.pathname
  }

  /**
   * Gets the query parameters from the event URL.
   *
   * @returns A record of query parameters.
   */
  get query (): Record<string, string> {
    return this.eventQuery ?? {}
  }

  /**
   * Gets the hash fragment from the event URL.
   *
   * @returns The hash fragment as a string.
   */
  get hash (): string {
    return this.url.hash
  }

  /**
   * Gets the protocol for the route.
   *
   * @returns The protocol as a string (`http` or `https`).
   */
  get protocol (): string {
    return this.options.protocol ?? this.url.protocol.replace(':', '').trim()
  }

  /**
   * Gets the HTTP method for the route.
   *
   * @returns The HTTP method.
   */
  get method (): HttpMethod {
    return this.options.method
  }

  /**
   * Gets the hostname of the route.
   *
   * @returns The hostname as a string.
   */
  get domain (): string {
    return this.url.hostname
  }

  /**
   * Checks if the route has a domain constraint.
   *
   * @returns `true` if the route has a domain constraint, otherwise `false`.
   */
  hasDomain (): boolean {
    return this.options.domain !== undefined
  }

  /**
   * Checks if the route has any parameters.
   *
   * @returns `true` if parameters are present, otherwise `false`.
   */
  hasParams (): boolean {
    return Object.keys(this.params).length > 0
  }

  /**
   * Checks if the route has a specific parameter.
   *
   * @param name - The name of the parameter to check.
   * @returns `true` if the parameter exists, otherwise `false`.
   */
  hasParam (name: string): boolean {
    return this.params[name] !== undefined
  }

  /**
   * Retrieves the value of a specific parameter.
   *
   * @param name - The name of the parameter to retrieve.
   * @returns The value of the parameter or the fallback value if not found.
   */
  getParam<TReturn = unknown>(name: string): TReturn | undefined

  /**
   * Retrieves the value of a specific parameter.
   *
   * @param name - The name of the parameter to retrieve.
   * @param fallback - A fallback value if the parameter is not found.
   * @returns The value of the parameter or the fallback value if not found.
   */
  getParam<TReturn = unknown>(name: string, fallback: TReturn): TReturn

  /**
   * Retrieves the value of a specific parameter.
   *
   * @param name - The name of the parameter to retrieve.
   * @param fallback - An optional fallback value if the parameter is not found.
   * @returns The value of the parameter or the fallback value if not found.
   */
  getParam<TReturn = unknown>(name: string, fallback?: TReturn): TReturn | undefined {
    return this.params[name] as TReturn ?? fallback
  }

  /**
   * Retrieves all parameters that are defined (non-undefined values).
   *
   * @returns A record of defined parameters.
   */
  getDefinedParams (): RouteParams {
    return Object.fromEntries(Object.entries(this.params).filter(([_, value]) => value !== undefined))
  }

  /**
   * Retrieves the names of all parameters.
   *
   * @returns An array of parameter names.
   */
  getParamNames (): string[] {
    return Object.keys(this.params)
  }

  /**
   * Retrieves the names of all optional parameters.
   *
   * @returns An array of optional parameter names.
   */
  getOptionalParamNames (): string[] {
    return this
      .getParamNames()
      .filter(param => this.uriConstraints.find(v => v.param === param)?.optional === true)
  }

  /**
   * Checks if a parameter name is optional.
   *
   * @param name - The name of the parameter to check.
   * @returns `true` if the parameter is optional, otherwise `false`.
   */
  isParamNameOptional (name: string): boolean {
    return this.getOptionalParamNames().includes(name)
  }

  /**
   * Retrieves a specified option from the route configuration.
   *
   * @param key - The key of the option to retrieve.
   * @returns The value of the option or the fallback value if not found.
   */
  getOption<TReturn = unknown>(key: keyof RouteOptions): TReturn | undefined

  /**
   * Retrieves a specified option from the route configuration.
   *
   * @param key - The key of the option to retrieve.
   * @param fallback - A fallback value if the option is not found.
   * @returns The value of the option or the fallback value if not found.
   */
  getOption<TReturn = unknown>(key: keyof RouteOptions, fallback: TReturn): TReturn

  /**
   * Retrieves a specified option from the route configuration.
   *
   * @param key - The key of the option to retrieve.
   * @param fallback - An optional fallback value if the option is not found.
   * @returns The value of the option or the fallback value if not found.
   */
  getOption<TReturn = unknown>(key: keyof RouteOptions, fallback?: TReturn): TReturn | undefined {
    return this.options[key] as TReturn ?? fallback
  }

  /**
   * Retrieves a specified options from the route configuration.
   *
   * @param keys - The kesy of the option to retrieve.
   * @returns The values of the option.
   */
  getOptions<TReturn = unknown>(keys: string[]): Record<string, TReturn> {
    return Object.fromEntries(keys.map(key => [key, this.options[key] as TReturn]))
  }

  /**
   * Adds a middleware to the route.
   *
   * @param middleware - The middleware to add.
   * @returns The updated `Route` instance.
   */
  addMiddleware (
    middleware: MixedPipe<IncomingEventType, OutgoingResponseType> | Array<MixedPipe<IncomingEventType, OutgoingResponseType>>
  ): this {
    this.options.middleware = (this.options.middleware ?? []).concat(middleware)
    return this
  }

  /**
   * Checks if the route requires HTTPS for security.
   *
   * @returns `true` if the route is HTTPS-only, otherwise `false`.
   */
  isSecure (): boolean {
    return this.isHttpsOnly()
  }

  /**
   * Checks if the route uses HTTP protocol.
   *
   * @returns `true` if the route is HTTP-only, otherwise `false`.
   */
  isHttpOnly (): boolean {
    return this.protocol === 'http'
  }

  /**
   * Checks if the route uses HTTPS protocol.
   *
   * @returns `true` if the route is HTTPS-only, otherwise `false`.
   */
  isHttpsOnly (): boolean {
    return this.protocol === 'https'
  }

  /**
   * Checks if the route is marked as a fallback route.
   *
   * @returns `true` if the route is a fallback, otherwise `false`.
   */
  isFallback (): boolean {
    return this.options.fallback ?? false
  }

  /**
   * Checks if the route operates in strict mode.
   *
   * @returns `true` if the route is strict, otherwise `false`.
   */
  isStrict (): boolean {
    return this.options.strict === true
  }

  /**
   * Determines if a specific middleware is excluded from execution.
   *
   * @param mixedMiddleware - The middleware to check.
   * @returns `true` if the middleware is excluded, otherwise `false`.
   */
  isMiddlewareExcluded (mixedMiddleware: MixedPipe<IncomingEventType, OutgoingResponseType>): boolean {
    const metaMid = mixedMiddleware as MetaPipe<IncomingEventType, OutgoingResponseType>
    const middleware = isFunctionPipe(metaMid) ? mixedMiddleware : metaMid.module
    return this.getOption<Array<MixedPipe<IncomingEventType, OutgoingResponseType>>>(
      'excludeMiddleware'
    )?.includes(middleware) === true
  }

  /**
   * Checks if the route matches the provided options.
   *
   * @param options - The options to match against the route.
   * @returns `true` if the route matches the options, otherwise `false`.
  */
  matchesOptions (options: Partial<RouteOptions<IncomingEventType, OutgoingResponseType>>): boolean {
    return Object
      .entries(options)
      .reduce((matched, [key, value]) => matched && this.options[key] === value, true)
  }

  /**
   * Checks if the provided event matches the route.
   *
   * @param event - The incoming event to check against the route.
   * @param includingMethod - Whether to include HTTP method matching in the evaluation.
   * @returns `true` if the event matches the route, otherwise `false`.
   */
  matches (event: IncomingEventType, includingMethod: boolean): boolean {
    return this.matchers
      .filter(matcher => !(!includingMethod && matcher === methodMatcher)) // Skip method matcher if not needed
      .reduce((matched, matcher) => matched && matcher({ route: this, event }), true)
  }

  /**
   * Binds the provided event to the route, initializing route parameters and query data.
   *
   * @param event - The incoming event to bind to the route.
   * @returns A promise that resolves once the binding is complete.
   */
  async bind (event: IncomingEventType): Promise<void> {
    this.eventUrl = event.url
    this.routeParams = await this.bindParameters(event)
    this.eventQuery = Object.fromEntries(event.query?.entries() ?? [])
  }

  /**
   * Executes the route's action based on the provided event.
   *
   * Note: The order of execution is important and should not be changed.
   *
   * @param event - The incoming event to handle.
   * @returns A promise that resolves to the outgoing response generated by the route's action.
   * @throws `RouterError` if the route action is invalid.
   */
  async run (event: IncomingEventType): Promise<OutgoingResponseType> {
    if (this.isRedirection()) {
      return await this.runRedirection(event, this.options.redirect)
    } else if (this.isComponent()) {
      return await this.runComponent(event)
    } else if (this.isHandler()) {
      return await this.runHandler(event)
    } else if (this.isCallable()) {
      return await this.runCallable(event)
    } else {
      throw new RouterError('Invalid handler provided.')
    }
  }

  /**
   * Generates a URL or URI for the route with optional parameters, query, hash, and protocol.
   *
   * @param options - Options for generating the URL.
   *   - `params`: Route parameters to include in the path.
   *   - `query`: Query parameters to append to the URL.
   *   - `hash`: A hash fragment to include in the URL.
   *   - `withDomain`: Whether to include the domain in the URL.
   *   - `protocol`: The protocol to use in the URL.
   * @returns The generated URL as a string.
   * @throws `RouterError` if required parameters are missing.
   */
  generate ({ params = {}, query = {}, hash = '', withDomain = false, protocol }: Omit<GenerateOptions, 'name'>): string {
    // Helper to construct hash value
    const formatHash = (hash: string): string => hash.length > 0 ? (hash.startsWith('#') ? hash : `#${hash}`) : ''

    // Build query parameters
    const queryParams = new URLSearchParams(
      Object.entries(params)
        .filter(([name]) => !this.uriConstraints.some(constraint => constraint.param === name))
        .concat(Object.entries(query))
    ).toString()

    // Build path from URI constraints
    const path = this.uriConstraints.reduce((prevPath, constraint): string => {
      const paramValue = params[constraint.param ?? ''] ?? constraint.default

      // Validate required parameters
      if (constraint.param !== undefined && constraint.optional !== true && paramValue === undefined) {
        throw new RouterError(`Missing required parameter "${String(constraint.param)}"`)
      }

      // Handle domain constraints
      if (withDomain && constraint.suffix !== undefined) {
        return [protocol ?? this.protocol, '://', paramValue, constraint.suffix, prevPath].filter(Boolean).join('')
      }

      // Append path segments
      return [prevPath, constraint.prefix, constraint.param !== undefined ? paramValue : constraint.match, '/'].filter(Boolean).join('')
    }, '/').replace(/(?<!:)(\/{2,})/g, '/') // Replace redundant slashes

    // Combine path, query, and hash
    return [path, queryParams?.length > 0 && `?${queryParams}`, formatHash(hash)].filter(Boolean).join('')
  }

  /**
   * Sets the resolver for the route.
   * The resolver is used to resolve the route's handler.
   *
   * @param resolver - The resolver to set.
   * @returns The updated `Route` instance.
   */
  setResolver (resolver?: DependencyResolver): this {
    this.resolver = resolver
    return this
  }

  /**
   * Sets the matchers to use for evaluating if an event matches the route.
   *
   * @param matchers - An array of matchers to set.
   * @returns The updated `Route` instance.
   */
  setMatchers (matchers: Array<IMatcher<IncomingEventType, OutgoingResponseType>>): this {
    this.matchers = matchers
    return this
  }

  /**
   * Sets the dispatchers for handling callable or handler actions.
   *
   * @param dispatchers - The dispatchers to set.
   * @returns The updated `Route` instance.
   */
  setDispatchers (dispatchers: IDispachers<IncomingEventType, OutgoingResponseType>): this {
    this.dispatchers = dispatchers
    return this
  }

  /**
   * Converts the route into a JSON object representation.
   *
   * @returns A JSON object representing the route.
   */
  async toJSON (): Promise<Record<string, unknown>> {
    return {
      path: this.options.path,
      method: this.options.method,
      handler: this.isHandler() ? (await this.getHandlerFullname()) : 'callable',
      name: this.options.name ?? 'N/A',
      domain: this.options.domain ?? 'N/A',
      fallback: this.isFallback()
    }
  }

  /**
   * Converts the route into a string representation (JSON format).
   *
   * @returns A JSON string representing the route.
   */
  async toString (): Promise<string> {
    return JSON.stringify(await this.toJSON())
  }

  private async bindParameters (event: IncomingEventType): Promise<RouteParams> {
    if (event.getUri === undefined) {
      throw new RouterError('Event must have a `getUri` method.')
    }

    const params: RouteParams = {}

    const matches = event
      .getUri(this.hasDomain())
      ?.match(uriRegex(this.options))
      ?.filter((_v, i) => i > 0)
      .map(v => !isNaN(Number(v)) ? parseFloat(v) : v)

    for (const [i, constraint] of this.uriConstraints.filter(({ param }) => param !== undefined).entries()) {
      let value: unknown = matches?.[i]

      if (constraint.param !== undefined) {
        value = this.hasModelBinding(constraint.param) ? await this.bindValue(constraint.param, value, constraint.alias) : value
        params[constraint.param] = value ?? constraint.default

        if (params[constraint.param] === undefined && constraint.optional !== true) {
          throw new RouteNotFoundError(`No value found for this key "${String(constraint.param)}".`)
        }
      }
    }

    return Object
      .entries(this.options.defaults ?? {})
      .reduce((prev, [name, value]) => prev[name] !== undefined ? prev : { ...prev, [name]: value }, params)
  }

  private hasModelBinding (key: string): boolean {
    return this.options.bindings?.[key] !== undefined
  }

  private bindValue (field: string, value: unknown, alias?: string): Promiseable<unknown> {
    const key = alias ?? field
    const bindingOptions = this.options.bindings?.[field]
    const bindingResolver = (bindingOptions as IBoundModel)?.resolveRouteBinding ?? bindingOptions

    if (typeof bindingResolver === 'function') {
      return bindingResolver(key, value, this.resolver)
    } else {
      throw new RouterError('Binding must be either a class with a static bindingResolver method or a function.')
    }
  }

  private isRedirection (): this is this & { options: { redirect: string } } {
    return this.options.redirect !== undefined
  }

  private isCallable (): boolean {
    return (
      isMetaFactoryModule(this.options.handler) ||
      isMetaFunctionModule(this.options.handler) ||
      isFunctionModule(this.options.handler)
    )
  }

  private isHandler (): boolean {
    return isMetaClassModule(this.options.handler)
  }

  private isComponent (): boolean {
    return isMetaComponentModule(this.options.handler)
  }

  private async getCallable (): Promise<FunctionalEventHandler<IncomingEventType, OutgoingResponseType>> {
    if (isMetaFactoryModule<FactoryEventHandler<IncomingEventType, OutgoingResponseType>>(this.options.handler)) {
      return (await this.resolveHandlerModule<FactoryEventHandler<IncomingEventType, OutgoingResponseType>>(this.options.handler))(this.resolver)
    } else if (isMetaFunctionModule<FunctionalEventHandler<IncomingEventType, OutgoingResponseType>>(this.options.handler)) {
      return await this.resolveHandlerModule<FunctionalEventHandler<IncomingEventType, OutgoingResponseType>>(this.options.handler)
    } else if (isFunctionModule<FunctionalEventHandler<IncomingEventType, OutgoingResponseType>>(this.options.handler)) {
      return this.options.handler
    } else {
      throw new RouterError('Invalid callable provided.')
    }
  }

  private async getHandlerClass (): Promise<EventHandlerClass<IncomingEventType, OutgoingResponseType>> {
    if (isMetaClassModule<EventHandlerClass<IncomingEventType, OutgoingResponseType>>(this.options.handler)) {
      return await this.resolveHandlerModule<EventHandlerClass<IncomingEventType, OutgoingResponseType>>(this.options.handler)
    } else {
      throw new RouterError('Invalid event handler provided.')
    }
  }

  /**
   * Resolves the handler module if it is a lazy-loaded module.
   * Lazy module are modules that are loaded only when needed.
   * They are defined using dynamic imports `import('lazy-module.mjs').then(v => v.myModule)`.
   * Note: Lazy-loaded only applies to class and functional handlers.
   *
   * @param handler - The handler to resolve.
   * @returns The resolved handler module.
  */
  private async resolveHandlerModule<HandlerType>(handler: unknown): Promise<HandlerType> {
    if (
      isObjectLikeModule<MetaComponentEventHandler<IncomingEventType, OutgoingResponseType>>(handler) &&
      isFunctionModule<LazyComponentEventHandler<IncomingEventType, OutgoingResponseType>>(handler.module) &&
      handler.lazy === true
    ) {
      return await handler.module() as HandlerType
    }
    return (handler as MetaComponentEventHandler<IncomingEventType, OutgoingResponseType>).module as HandlerType
  }

  private async getHandlerInstance (): Promise<IEventHandler<IncomingEventType, OutgoingResponseType>> {
    return this.resolveModule<IEventHandler<IncomingEventType, OutgoingResponseType>>(await this.getHandlerClass())
  }

  private getHandlerAction (): string {
    if (isObjectLikeModule<MetaEventHandler<IncomingEventType, OutgoingResponseType>>(this.options.handler)) {
      return this.options.handler.action ?? 'handle'
    }
    return 'handle'
  }

  private async getHandlerFullname (): Promise<string> {
    return `${(await this.getHandlerClass()).name}@${String(this.getHandlerAction())}`
  }

  private getDispatcher (type: 'callable' | 'handler' | 'component'): IDispacher<IncomingEventType, OutgoingResponseType> {
    if (isNotEmpty<IDispacher<IncomingEventType, OutgoingResponseType>>(this.dispatchers?.[type])) {
      return this.dispatchers[type]
    } else {
      throw new RouterError(`Dispatcher for ${type} not found`)
    }
  }

  private async runCallable (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.getDispatcher('callable')({
      event,
      resolver: this.resolver,
      handler: await this.getCallable()
    })
  }

  private async runHandler (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.getDispatcher('handler')({
      event,
      resolver: this.resolver,
      action: this.getHandlerAction(),
      handler: await this.getHandlerInstance()
    })
  }

  /**
   * For the component we don't resolve the handler here.
   * So Component third party library can handle all the logic.
  */
  private async runComponent (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.getDispatcher('component')({
      event,
      resolver: this.resolver,
      handler: this.options.handler
    })
  }

  private async runRedirection (event: IncomingEventType, redirect: string | Record<string, unknown> | Function, statusCode: number = 302): Promise<OutgoingResponseType> {
    if (typeof redirect === 'object') {
      return await this.runRedirection(event, redirect.location as string, parseInt(redirect.status as string))
    } else if (typeof redirect === 'function') {
      return await this.runRedirection(event, await redirect(this, event))
    } else {
      return { statusCode, headers: { Location: redirect } } as unknown as OutgoingResponseType
    }
  }

  private resolveModule <T extends BindingValue>(Class: BindingKey): T {
    return this.resolver?.resolve<T>(Class) ?? new (Class as new () => T)()
  }

  private validateOptions (options: RouteOptions<IncomingEventType, OutgoingResponseType>): void {
    if (options === undefined) {
      throw new RouterError('Route options are required to create a Route instance')
    }
  }
}
