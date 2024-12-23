import { methodMatcher } from './matchers'
import { RouterError } from './errors/RouterError'
import { uriConstraints, uriRegex } from './utils'
import { MetaPipe, MixedPipe } from '@stone-js/pipeline'
import { RouteNotFoundError } from './errors/RouteNotFoundError'
import { ClassType, isConstructor, OutgoingResponseOptions } from '@stone-js/core'
import { BindingKey, BindingValue, FlattenedRouteDefinition, GenerateOptions, HttpMethod, IBoundModel, IContainer, IControllerInstance, IDispacher, IDispachers, IIncomingHttpEvent, IMatcher, IOutgoingHttpResponse, IOutgoingResponse, OutgoingResponseResolver, RouteParams, RouterAction, RouterCallableAction, RouteSegmentConstraint } from './declarations'

export interface RouteOptions extends FlattenedRouteDefinition {
  children?: never
  action: RouterAction
}

export class Route<
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
> {
  private eventUrl?: URL
  private matchers?: IMatcher[]
  private container?: IContainer
  private routeParams?: RouteParams
  private dispatchers?: IDispachers
  private eventQuery?: Record<string, string>
  private outgoingResponseResolver?: OutgoingResponseResolver
  private readonly uriConstraints: Array<Partial<RouteSegmentConstraint>>

  static create<
    IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
    OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
  >(options: RouteOptions): Route<IncomingEventType, OutgoingResponseType> {
    return new this(options)
  }

  constructor (public readonly options: RouteOptions) {
    this.validateOptions(options)
    this.uriConstraints = uriConstraints(options)
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
    return this.options.protocol ?? (this.url.protocol.replace(':', '').trim() || 'http')
  }

  get method (): HttpMethod {
    return this.options.method
  }

  get getDomain (): string {
    return this.url.hostname
  }

  getOption<TReturn = unknown>(key: keyof RouteOptions, fallback?: TReturn): TReturn | undefined {
    return this.options[key] as TReturn ?? fallback
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

  getParam<TReturn = unknown>(name: string, fallback?: TReturn): TReturn | undefined {
    return this.params[name] as TReturn ?? fallback
  }

  getDefinedParams (): RouteParams {
    return Object.fromEntries(Object.entries(this.params).filter(([_, value]) => value !== undefined))
  }

  getParamNames (): string[] {
    return Object.keys(this.params)
  }

  optionalParamNames (): string[] {
    return this
      .getParamNames()
      .filter(param => this.uriConstraints.find(v => v.param === param)?.optional === true)
  }

  isParamNameOptional (name: string): boolean {
    return this.optionalParamNames().includes(name)
  }

  isSecure (): boolean {
    return this.isHttpsOnly()
  }

  isHttpOnly (): boolean {
    return this.protocol === 'http'
  }

  isHttpsOnly (): boolean {
    return this.protocol === 'https'
  }

  isFallback (): boolean {
    return this.options.fallback ?? false
  }

  isStrict () {
    return this.options.strict ?? false
  }

  isMiddlewareExcluded (mixedMiddleware: MixedPipe): boolean {
    const metaMid = mixedMiddleware as MetaPipe
    const middleware = metaMid.pipe === undefined ? mixedMiddleware : metaMid.pipe
    return this.getOption<MixedPipe[]>('excludeMiddleware')?.includes(middleware) === true
  }

  matches (event: IncomingEventType, includingMethod: boolean): boolean {
    return this.matchers
      ?.filter(matcher => !(!includingMethod && matcher === methodMatcher)) // Skip method matcher if not needed
      .reduce((matched, matcher) => !matched ? matched : matcher({ route: this, event }), true) ?? false
  }

  async bind (event: IncomingEventType): Promise<void> {
    this.eventUrl = event.url
    this.routeParams = await this.bindParameters(event)
    this.eventQuery = Object.fromEntries(event.query.entries())
  }

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

  generate ({ params = {}, query = {}, hash = '', withDomain = false, protocol }: Omit<GenerateOptions, 'name'>): string {
    const hashValue = hash?.length > 0 ? (hash.startsWith('#') ? hash : `#${hash}`) : ''
    const restParams = Object.entries(params).filter(([name]) => this.uriConstraints.find(v => name === v.param) === undefined)
    const path = this.uriConstraints.reduce((prev, constraint): string => {
      if (withDomain && constraint.suffix !== undefined) {
        return `${protocol ?? this.protocol}://${params[constraint.param ?? ''] ?? constraint.default ?? ''}${constraint.suffix}${prev}`
      } else {
        return `${prev}${constraint.prefix ?? ''}${constraint.param ? (params[constraint.param] ?? constraint.default) : constraint.match}/`
      }
    }, '/')

    if (restParams.length > 0) {
      return `${path}?${new URLSearchParams(restParams.concat(Object.entries(query))).toString()}${hashValue}`
    } else {
      return `${path}${hashValue}`
    }
  }

  setContainer (container?: IContainer): this {
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

  setOutgoingResponseResolver (resolver?: OutgoingResponseResolver): this {
    this.outgoingResponseResolver = resolver
    return this
  }

  /**
   * Get route as literal object.
   *
   * @return {Object}
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
   * Get route as string.
   *
   * @return {string}
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

    for (const i in this.uriConstraints) {
      let value: unknown = matches?.[i]
      const constraint = this.uriConstraints[i]

      if (constraint.param !== undefined) {
        value = this.hasModelBinding(constraint.param) ? await this.bindModel(constraint.param, value, constraint.alias, constraint.optional) : value
        params[constraint.param] = value ?? constraint.default
      }
    }

    return Object
      .entries(this.options.defaults ?? {})
      .reduce((prev, [name, value]) => prev[name] !== undefined ? prev : { ...prev, [name]: value }, params)
  }

  private hasModelBinding (key: string): boolean {
    return this.options.bindings?.[key] !== undefined
  }

  private async bindModel (field: string, value: unknown, alias?: string, isOptional?: boolean): Promise<unknown> {
    let model: unknown
    const key = alias ?? field
    const Model = this.options.bindings?.[field] as IBoundModel

    if (isConstructor(Model)) {
      if (Model.resolveRouteBinding) {
        try {
          model = await Model.resolveRouteBinding(key, value)
        } catch (error) {
          throw new RouteNotFoundError(`No model found for this value "${value}".`)
        }
      } else if (Model.prototype.resolveRouteBinding) {
        try {
          model = await this.resolveService<IBoundModel>(Model).resolveRouteBinding(key, value)
        } catch (error) {
          throw new RouteNotFoundError(`No model found for this value "${value}".`)
        }
      } else {
        throw new RouterError('Binding must have `resolveRouteBinding` as class or instance method.')
      }

      if (model === undefined && isOptional !== true) {
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

  private async runCallable (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.getDispatcher('callable')({ event, route: this, callable: this.getCallable() })
  }

  private async runController (event: IncomingEventType): Promise<OutgoingResponseType> {
    return await this.getDispatcher('controller')({ event, route: this, controller: this.getControllerInstance(), handler: this.getControllerActionHandler() })
  }

  private async runRedirection (event: IncomingEventType, redirect: string | Record<string, unknown> | Function, status: number = 302): Promise<OutgoingResponseType> {
    if (typeof redirect === 'object') {
      const [[status, location]] = Object.entries(redirect)
      return await this.runRedirection(event, location as string, parseInt(status))
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
