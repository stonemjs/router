import { methodMatcher } from "./matchers";
import { RouterError } from "./errors/RouterError";
import { ClassType, IRouter } from "@stone-js/core";
import { MetaPipe, MixedPipe, Pipe } from "@stone-js/pipeline";
import { RouteNotFoundError } from "./errors/RouteNotFoundError";
import { getDomainConstraints, getSegmentsConstraints, uriConstraints, uriRegex } from "./utils";
import { GenerateOptions, HttpMethod, IContainer, IDispacher, IDispachers, IIncomingEvent, IMatcher, IOutgoingResponse, RouteParams, RouterAction, RouterCallableAction, RouteSegmentConstraint } from "./declarations";

export interface RouteOptions {
  path: string;
  name?: string;
  domain?: string;
  strict?: boolean;
  protocol?: string;
  fallback?: boolean;
  method: HttpMethod;
  action: RouterAction;
  throttle?: Function[];
  middleware?: MixedPipe[];
  isInternalHeader?: boolean;
  excludeMiddleware?: Pipe[];
  rules?: Record<string, RegExp>;
  defaults?: Record<string, unknown>;
  bindings?: Record<string, Function>;
  redirect?: string | Record<string, unknown> | Function;
}

export class Route<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> {
  public readonly options: RouteOptions;
  
  private eventUrl?: URL;
  private matchers?: IMatcher[];
  private container?: IContainer;
  private routeParams?: RouteParams;
  private dispatchers?: IDispachers;
  private eventQuery?: Record<string, string>;


  static create<
    IncomingEventType extends IIncomingEvent = IIncomingEvent,
    OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
  >(options: RouteOptions): Route<IncomingEventType, OutgoingResponseType> {
    return new this(options);
  }
  
  constructor (options: RouteOptions) {
    if (options === undefined) {
      throw new RouterError('Route options are required to create a Route instance')
    }

    this.options = options
  }

  get params (): RouteParams {
    if (this.routeParams !== undefined) {
      return this.routeParams
    } else {
      throw new RouterError('Event is not bound')
    }
  }

  get url (): URL {
    return this.eventUrl ?? new URL('')
  }

  get uri (): string {
    return this.url.href
  }

  get path (): string {
    return this.url.pathname
  }

  get query (): Record<string, string> {
    return this.eventQuery ?? {}
  }

  get hash (): string {
    return this.url.hash
  }

  get protocol (): string {
    return this.options.protocol ?? this.url.protocol.replace(':', '')
  }

  get method (): HttpMethod {
    return this.options.method
  }

  getOption<TReturn = unknown>(key: keyof RouteOptions, fallback?: TReturn): TReturn | undefined {
    return this.options[key] ?? fallback;
  }

  hasDomain (): boolean {
    return this.options.domain !== undefined
  }

  hasParams (): boolean {
    return Object.keys(this.params).length > 0
  }

  hasParam (name: string): boolean {
    return this.params[name] !== undefined
  }

  getParam (name: string, fallback?: string): string | undefined {
    return this.params[name] ?? fallback
  }

  getDefinedParams (): RouteParams {
    return Object.fromEntries(Object.entries(this.params).filter(([_, value]) => value !== undefined))
  }

  getParamNames (): string[] {
    return Object.keys(this.params)
  }

  optionalParamNames (): string[] {
    const constraints = uriConstraints(this.options)
    return this
      .getParamNames()
      .filter(param => constraints.find(v => v.param === param)?.optional === true)
  }

  isParamNameOptional (name: string): boolean {
    return this.optionalParamNames().includes(name)
  }

  isSecure (): boolean {
    return this.isHttpsOnly()
  }

  isFallback (): boolean {
    return this.options.fallback ?? false
  }

  isStrict () {
    return this.options.strict ?? false
  }

  isHttpOnly (): boolean {
    return this.protocol === 'http'
  }

  isHttpsOnly (): boolean {
    return this.protocol === 'https'
  }

  isMiddlewareExcluded(mixedMiddleware: MixedPipe): boolean {
    const metaMid = mixedMiddleware as MetaPipe;
    const middleware = metaMid.pipe === undefined ? mixedMiddleware : metaMid.pipe;
    return this.getOption<MixedPipe[]>('excludeMiddleware')?.includes(middleware) === true;
  }

  isCallableAction (): boolean {
    return this.getActionType() === 'callable'
  }

  isControllerAction (): boolean {
    return this.getActionType() === 'controller'
  }

  getActionType (): string | undefined {
    return typeof this.options.action === 'function'
      ? 'callable' 
      : (typeof Object.values(this.options.action).pop() === 'function' ? 'controller' : undefined)
  }

  getCallable (): RouterCallableAction {
    return this.options.action
  }

  getController (): ClassType {
    return Object.values(this.options.action).pop() as ClassType
  }

  getControllerInstance (): Record<PropertyKey, RouterCallableAction> {
    return this.resolveService<Record<PropertyKey, RouterCallableAction>>(this.getController())
  }

  getControllerActionHandler (): string {
    return Object.keys(this.options.action).pop() as string
  }

  getControllerActionFullname (): string {
    return `${this.getController().name}@${this.getControllerActionHandler()}`
  }

  matches (event: IncomingEventType, includingMethod: boolean): boolean {
    return this.matchers
      ?.filter(matcher => !(!includingMethod && matcher === methodMatcher)) // Skip method matcher if not needed
      .reduce((matched, matcher) => !matched ? matched : matcher({ route: this, event }), true) ?? false
  }

  async bind (event: IncomingEventType): Promise<void> {
    this.eventUrl = event.url
    this.eventQuery = event.query
    this.routeParams = await this.bindParameters(event)
  }

  run (event: IncomingEventType): OutgoingResponseType {
    if (this.options.redirect !== undefined) {
      return this.runRedirection(event, this.options.redirect)
    } else if (this.isControllerAction()) {
      return this.runController(event)
    } else if (this.isCallableAction()) {
      return this.runCallable(event)
    } else {
      throw new RouterError('Invalid action provided.')
    }
  }

  generate ({ params, withDomain, protocol }: Omit<GenerateOptions, 'name'>): string {
    const pathConstraints = getSegmentsConstraints(this.options)

    let query = Object.entries(params ?? {}).filter(([name]) => pathConstraints.find(v => name === v.param) === undefined) // Filter out query params
    let path = pathConstraints.reduce((prev, curr) => `${prev}${curr.prefix ?? ''}${curr.param ? (params?.[curr.param] ?? curr.default) : curr.match}/`, '/')

    if (withDomain === true) {
      const domainConstraints = getDomainConstraints(this.options)
      if (domainConstraints?.suffix !== undefined) {
        protocol ??= this.protocol ?? 'http'
        query = query.filter(([name]) => name !== domainConstraints.param)
        path = `${protocol}://${params?.[domainConstraints.param ?? ''] ?? domainConstraints.default ?? ''}${domainConstraints.suffix}${path}`
      }
    }

    if (query.length > 0) {
      const queryString = new URLSearchParams(query).toString()
      path = `${path}?${queryString}`
    }

    return path
  }

  setContainer (container: IContainer): this {
    this.container = container
    return this
  }

  setMatchers (matchers: IMatcher[]): this {
    this.matchers = matchers
    return this
  }

  setDispatchers (dispatchers: IDispachers): this {
    this.dispatchers = dispatchers
    return this
  }

  private async bindParameters (event: IncomingEventType): Promise<RouteParams> {
    if (event.getUri === undefined) {
      throw new RouterError('Event must have a `getUri` method.')
    }

    const params = {}
    const constraints = uriConstraints(this.options).filter(v => v.param)

    const matches = event
      .getUri(this.hasDomain())
      .match(uriRegex(this.options))
      ?.filter((_v, i) => i > 0)
      .map(v => !isNaN(Number(v)) ? parseFloat(v) : v)

    for (const i in constraints) {
      const v = constraints[i]
      let value = matches?.[i]
      if (this.hasModelBinding(v.param ?? '')) {
        value = await this.bindModel(v.param ?? '', value, v.alias, v.optional)
      }
      params[v.param ?? ''] = value ?? v.default
    }

    return Object
      .entries(this.options.defaults ?? {})
      .reduce((prev, [name, value]) => prev[name] ? prev : { ...prev, [name]: value }, params)
  }

  private hasModelBinding (key: string): boolean {
    return this.options.bindings?.[key] !== undefined
  }

  private async bindModel (field: string, value: unknown, alias: string, isOptional: boolean): Promise<unknown> {
    let model = null
    const key = alias ?? field
    const Class = this.options.bindings?.[field]

    if (isConstructor(Class)) {
      if (Class.resolveRouteBinding) {
        try {
          model = await Class.resolveRouteBinding(key, value)
        } catch (error) {
          throw new RouteNotFoundError(`No model found for this value "${value}".`)
        }
      } else if (Class.prototype.resolveRouteBinding) {
        try {
          model = await this.resolveService(Class).resolveRouteBinding(key, value)
        } catch (error) {
          throw new RouteNotFoundError(`No model found for this value "${value}".`)
        }
      } else {
        throw new TypeError('Binding must have this `resolveRouteBinding` as class or instance method.')
      }

      if (!model && !isOptional) {
        throw new RouteNotFoundError(`No model found for this value "${value}".`)
      }

      return model
    } else {
      throw new RouterError('Binding must be a class.')
    }
  }

  private getDispatcher (type: 'callable' | 'controller'): IDispacher {
    if (this.dispatchers?.[type] === undefined) {
      throw new RouterError(`Dispatcher for ${type} not found`)
    } else {
      return this.dispatchers[type]
    }
  }

  private runCallable (event: IncomingEventType): OutgoingResponseType {
    return this.getDispatcher('callable')({ event, router: this, callable: this.getCallable() })
  }

  private runController (event: IncomingEventType): OutgoingResponseType {
    return this.getDispatcher('controller')({ event, route: this, controller: this.getControllerInstance(), method: this.getControllerActionHandler() })
  }

  private async runRedirection (event: IncomingEventType, redirect: string | Record<string, unknown> | Function, status: number = 302): OutgoingResponseType {
    if (typeof redirect === 'object') {
      const [[status, location]] = Object.entries(redirect)
      return this.runRedirection(event, location as string, parseInt(status))
    } else if (typeof redirect === 'function') {
      return this.runRedirection(event, await redirect(this, event))
    } else {
      return { status, statusCode: status, headers: { Location: redirect } }
    }
  }

  private resolveService <T extends ClassType>(Class: T): T {
    return this.container?.resolve<T>(Class) ?? new (Class as new () => T)();
  }

  /**
   * Get route as literal object.
   *
   * @return {Object}
   */
  toJSON (): Record<string, unknown> {
    return {
      path: this.path,
      method: this.method,
      action: this.isControllerAction() ? this.getControllerActionFullname() : this.getActionType(),
      name: this.options.name ?? 'N/A',
      domain: this.options.domain ?? 'N/A',
      fallback: this.isFallback()
    }
  }

  /**
   * Get route as string.
   *
   * @return {string}
   */
  toString (): string {
    return JSON.stringify(this.toJSON())
  }
}