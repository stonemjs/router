import { methodMatcher } from './matchers'
import { RouterError } from './errors/RouterError'
import { uriConstraints, uriRegex } from './utils'
import { MetaPipe, MixedPipe } from '@stone-js/pipeline'
import { RouteNotFoundError } from './errors/RouteNotFoundError'
import { ClassType, OutgoingResponseOptions } from '@stone-js/core'
import { BindingKey, BindingValue, RouteDefinition, GenerateOptions, HttpMethod, IBoundModel, IContainer, IControllerInstance, IDispacher, IDispachers, IIncomingEvent, IMatcher, IOutgoingResponse, OutgoingResponseResolver, RouteParams, RouterAction, RouterCallableAction, RouteSegmentConstraint } from './declarations'

/**
 * Defines the options for creating a `Route` instance.
 */
export interface RouteOptions extends RouteDefinition {
  path: string
  domain?: string
  methods?: never
  children?: never
  protocol?: string
  method: HttpMethod
  action: RouterAction
}

/**
 * Represents a route that defines how incoming events are handled.
 *
 * @template IncomingEventType - The type of the incoming event.
 * @template OutgoingResponseType - The type of the outgoing response.
 */
export class Route<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> {
  private eventUrl?: URL
  private matchers: IMatcher[]
  private container?: IContainer
  private routeParams?: RouteParams
  private dispatchers?: IDispachers
  private eventQuery?: Record<string, string>
  private outgoingResponseResolver?: OutgoingResponseResolver

  private readonly uriConstraints: Array<Partial<RouteSegmentConstraint>>

  /**
   * Factory method for creating a route instance.
   *
   * @param options - Configuration options for the route.
   * @returns A new `Route` instance.
   */
  static create<
    IncomingEventType extends IIncomingEvent = IIncomingEvent,
    OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
  >(options: RouteOptions): Route<IncomingEventType, OutgoingResponseType> {
    return new this(options)
  }

  /**
   * Creates a new `Route` instance.
   *
   * @param options - Configuration options for the route.
   * @returns A new `Route` instance.
   */
  constructor (public readonly options: RouteOptions) {
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
  isMiddlewareExcluded (mixedMiddleware: MixedPipe): boolean {
    const metaMid = mixedMiddleware as MetaPipe
    const middleware = metaMid.pipe === undefined ? mixedMiddleware : metaMid.pipe
    return this.getOption<MixedPipe[]>('excludeMiddleware')?.includes(middleware) === true
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
      .reduce((matched, matcher) => !matched ? matched : matcher({ route: this, event }), true)
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
    this.eventQuery = Object.fromEntries(event.query.entries())
  }

  /**
   * Executes the route's action based on the provided event.
   *
   * @param event - The incoming event to handle.
   * @returns A promise that resolves to the outgoing response generated by the route's action.
   * @throws `RouterError` if the route action is invalid.
   */
  async run (event: IncomingEventType): Promise<OutgoingResponseType> {
    if (this.options.redirect !== undefined) {
      return await this.runRedirection(event, this.options.redirect)
    } else if (this.isControllerAction()) {
      return await this.runController(event)
    } else if (this.isCallableAction()) {
      return await this.runCallable(event)
    } else {
      throw new RouterError('Invalid action provided.')
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
   * Sets the dependency injection container for the route.
   *
   * @param container - The dependency injection container to set.
   * @returns The updated `Route` instance.
   */
  setContainer (container?: IContainer): this {
    this.container = container
    return this
  }

  /**
   * Sets the matchers to use for evaluating if an event matches the route.
   *
   * @param matchers - An array of matchers to set.
   * @returns The updated `Route` instance.
   */
  setMatchers (matchers: IMatcher[]): this {
    this.matchers = matchers
    return this
  }

  /**
   * Sets the dispatchers for handling callable or controller actions.
   *
   * @param dispatchers - The dispatchers to set.
   * @returns The updated `Route` instance.
   */
  setDispatchers (dispatchers: IDispachers): this {
    this.dispatchers = dispatchers
    return this
  }

  /**
   * Sets the resolver for outgoing responses.
   *
   * @param resolver - The resolver to set.
   * @returns The updated `Route` instance.
   */
  setOutgoingResponseResolver (resolver?: OutgoingResponseResolver): this {
    this.outgoingResponseResolver = resolver
    return this
  }

  /**
   * Converts the route into a JSON object representation.
   *
   * @returns A JSON object representing the route.
   */
  toJSON (): Record<string, unknown> {
    return {
      path: this.options.path,
      method: this.options.method,
      action: this.isControllerAction() ? this.getControllerActionFullname() : this.getActionType(),
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
  toString (): string {
    return JSON.stringify(this.toJSON())
  }

  private makeOutgoingResponse<OptionsType extends OutgoingResponseOptions>(options: OptionsType): OutgoingResponseType | Promise<OutgoingResponseType> {
    if (this.outgoingResponseResolver === undefined) {
      throw new RouterError('Outgoing response resolver is not set.')
    } else {
      return this.outgoingResponseResolver(options)
    }
  }

  private isCallableAction (): boolean {
    return this.getActionType() === 'callable'
  }

  private isControllerAction (): boolean {
    return this.getActionType() === 'controller'
  }

  private getActionType (): string | undefined {
    return typeof this.options.action === 'function'
      ? 'callable'
      : (typeof Object.values(this.options.action).pop() === 'function' ? 'controller' : undefined)
  }

  private getCallable (): RouterCallableAction {
    return this.options.action as RouterCallableAction
  }

  private getController (): ClassType {
    return Object.values(this.options.action).pop() as ClassType
  }

  private getControllerInstance (): IControllerInstance {
    return this.resolveService<IControllerInstance>(this.getController())
  }

  private getControllerActionHandler (): string {
    return Object.keys(this.options.action).pop() as string
  }

  private getControllerActionFullname (): string {
    return `${this.getController().name}@${this.getControllerActionHandler()}`
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

    for (const [i] of this.uriConstraints.entries()) {
      let value: unknown = matches?.[i]
      const constraint = this.uriConstraints[i]

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

  private bindValue (field: string, value: unknown, alias?: string): unknown | Promise<unknown> {
    const key = alias ?? field
    const bindingOptions = this.options.bindings?.[field]
    const bindingResolver = (bindingOptions as IBoundModel)?.resolveRouteBinding ?? bindingOptions

    if (typeof bindingResolver === 'function') {
      return bindingResolver(key, value, this.container)
    } else {
      throw new RouterError('Binding must be either a class with a static bindingResolver method or a function.')
    }
  }

  private getDispatcher (type: 'callable' | 'controller'): IDispacher {
    if (this.dispatchers?.[type] === undefined) {
      throw new RouterError(`Dispatcher for ${type} not found`)
    } else {
      return this.dispatchers[type]
    }
  }

  private async runCallable (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.getDispatcher('callable')({ event, route: this, callable: this.getCallable() })
  }

  private async runController (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.getDispatcher('controller')({ event, route: this, controller: this.getControllerInstance(), handler: this.getControllerActionHandler() })
  }

  private async runRedirection (event: IncomingEventType, redirect: string | Record<string, unknown> | Function, status: number = 302): Promise<OutgoingResponseType> {
    if (typeof redirect === 'object') {
      return await this.runRedirection(event, redirect.location as string, parseInt(redirect.status as string))
    } else if (typeof redirect === 'function') {
      return await this.runRedirection(event, await redirect(this, event))
    } else {
      return await this.makeOutgoingResponse({ status, statusCode: status, headers: { Location: redirect } })
    }
  }

  private resolveService <T extends BindingValue>(Class: BindingKey): T {
    return this.container?.resolve<T>(Class) ?? new (Class as new () => T)()
  }

  private validateOptions (options: RouteOptions): void {
    if (options === undefined) {
      throw new RouterError('Route options are required to create a Route instance')
    }
  }
}
