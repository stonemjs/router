import { Route } from './Route'
import { MatcherOptions } from './matchers'
import { DispatcherOptions } from './dispatchers'
import { MixedPipe, Pipe } from '@stone-js/pipeline'
import { AdapterConfig, ClassType, Event, IListener, IncomingEvent, OutgoingResponse, OutgoingResponseOptions } from '@stone-js/core'

/**
 * Parameters passed in a route.
 */
export type RouteParams = Record<string, unknown>

/**
 * Supported HTTP methods.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

/**
 * Represents a valid resolver for dependency binding.
 */
export type BindingResolver = (key: string, value: unknown, container?: IContainer) => Promise<unknown> | unknown

/**
 * Represents a model bound to a route.
 */
export type IBoundModel = Function & { resolveRouteBinding: BindingResolver }

/**
 * Represents a valid key for dependency binding.
 */
export type BindingKey = number | boolean | string | Function | object | symbol

/**
 * Represents a valid value for dependency binding.
 */
export type BindingValue = BindingKey

/**
 * A function that resolves a dependency from a container.
 */
export type ContainerResolver<V> = (container: IContainer) => V

/**
 * Defines the structure for route matchers.
 */
export type IMatcher = <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> (options: MatcherOptions<IncomingEventType, OutgoingResponseType>) => boolean

/**
 * Defines the structure for route dispatchers.
 */
export type IDispacher = <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> (options: DispatcherOptions<IncomingEventType, OutgoingResponseType>) => Promise<OutgoingResponseType>

/**
 * Collection of dispatchers for route handling.
 */
export type IDispachers = Record<'callable' | 'controller', IDispacher>

/**
 * Defines a router action, which can be callable or class-based.
 */
export type RouterAction = RouterCallableAction | RouterClassAction | string

/**
 * Represents a class-based router action.
 */
export type RouterClassAction = Record<string, ClassType> | ClassType

/**
 * Represents a callable router action.
 */
export type RouterCallableAction = <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> (context: RouterActionContext<IncomingEventType, OutgoingResponseType>) => OutgoingResponseType | Promise<OutgoingResponseType>

/**
 * Resolves outgoing HTTP responses.
 */
export type OutgoingResponseResolver = <
  OptionsType extends OutgoingResponseOptions,
  OutgoingResponseType extends OutgoingResponse
>(options: OptionsType) => OutgoingResponseType | Promise<OutgoingResponseType>

/**
 * Represents an instance of a controller with callable actions.
 */
export interface IControllerInstance {
  [k: PropertyKey]: RouterCallableAction
}

/**
 * Represents an outgoing response.
 */
export interface IOutgoingResponse extends OutgoingResponse {}

/**
 * Represents an incoming event.
 */
export interface IIncomingEvent extends IncomingEvent {
  url: URL
  host: string
  body?: unknown
  pathname: string
  method: HttpMethod
  query: URLSearchParams
  decodedPathname: string
  readonly isSecure: boolean
  getUri: (withDomain: boolean) => string
  isMethod: (method: HttpMethod) => boolean
  setRouteResolver: (resolver: (route: Route) => void) => void
}

/**
 * Context passed to router actions.
 */
export interface RouterActionContext<IncomingEventType extends IIncomingEvent, OutgoingResponseType extends IOutgoingResponse> {
  /** Request body content. */
  body?: unknown

  /** Parameters extracted from the route. */
  params: RouteParams

  /** Incoming HTTP event object. */
  event: IncomingEventType

  /** Query parameters from the request URL. */
  query: Record<string, string>

  /** Matched route for the current request. */
  route: Route<IncomingEventType, OutgoingResponseType>
}

/**
 * Defines a route using a decorator.
 */
export type DecoratorRouteDefinition = Omit<RouteDefinition, 'path' | 'action' | 'method' | 'children'>

/**
 * Defines a functional route without path, methods, or children.
 */
export type FunctionalRouteDefinition = Omit<RouteDefinition, 'path' | 'methods' | 'method' | 'children'>

/**
 * Defines a decorator route group without fallback, alias, or methods.
 */
export type DecoratorGroupRouteDefinition = Omit<DecoratorRouteDefinition, 'fallback' | 'alias' | 'methods'>

/**
 * Defines a functional route group with a required path.
 */
export type FunctionalRouteGroupDefinition = Omit<FunctionalRouteDefinition, 'action' | 'fallback' | 'alias'> & { path: string }

/**
 * Represents the structure of a route definition.
 */
export interface RouteDefinition {
  name?: string
  strict?: boolean
  fallback?: boolean
  method?: HttpMethod
  action?: RouterAction
  methods?: HttpMethod[]
  path: string | string[]
  middleware?: MixedPipe[]
  isInternalHeader?: boolean
  domain?: string | string[]
  excludeMiddleware?: Pipe[]
  protocol?: string | string[]
  children?: RouteDefinition[]
  rules?: Record<string, RegExp>
  defaults?: Record<string, unknown>
  redirect?: string | Record<string, unknown> | Function
  bindings?: Record<string, IBoundModel | BindingResolver>
  [k: string]: unknown
}

/**
 * Options for navigation.
 */
export interface NavigateOptions {
  name: string
  hash?: string
  query?: Record<string, string>
  params?: Record<string, string>
}

/**
 * Options for generating routes.
 */
export interface GenerateOptions extends NavigateOptions {
  protocol?: string
  withDomain?: boolean
}

/**
 * Represents a dependency injection container.
 */
export interface IContainer {
  has: (key: BindingKey) => boolean
  make: <V extends BindingValue>(key: BindingKey) => V
  instance: (key: BindingKey, value: BindingValue) => this
  alias: (key: BindingKey, aliases: string | string[]) => this
  resolve: <V extends BindingValue>(key: BindingKey, singleton?: boolean) => V
  singletonIf: <V extends BindingValue>(key: BindingKey, resolver: ContainerResolver<V>) => this
}

/**
 * Event emitter for handling application events.
 */
export interface IEventEmitter {
  emit: ((event: Event) => void) & ((event: CustomEvent) => void) & ((event: string, ...args: unknown[]) => void)
  on: ((event: Event, listener: IListener) => void) & ((event: string, listener: IListener) => void) & ((event: CustomEvent, listener: IListener) => void)
}

/**
 * Represents the router context.
 */
export interface RouterContext<U extends IIncomingEvent, V extends IOutgoingResponse> {
  event: U
  route: Route<U, V>
}

/**
 * Defines route segment constraints.
 */
export interface RouteSegmentConstraint {
  rule: RegExp
  param: string
  match: string
  alias: string
  prefix: string
  suffix: string
  default: unknown
  optional: boolean
  quantifier: string
}

/**
 * Represents the yargs argument vector.
 */
export interface IArgv {
  positional: (name: string, options: { type: string, choices: string[], desc: string }) => IArgv
}

/**
 * Command options.
 *
 * Represents the configuration options for a CLI command.
 */
export interface CommandOptions {
  name: string
  desc?: string
  args?: string | string[]
  alias?: string | string[]
  options?: (yargs: IArgv) => IArgv
}

/**
 * Configuration interface for the Node Cli Adapter.
 */
export interface NodeCliAdapterConfig extends AdapterConfig {
  commands: Array<[ClassType, CommandOptions]>
}
