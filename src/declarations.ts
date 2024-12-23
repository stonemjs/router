import { Route } from './Route'
import { MatcherOptions } from './matchers'
import { DispatcherOptions } from './dispatchers'
import { MixedPipe, Pipe } from '@stone-js/pipeline'
import { IncomingHttpEvent, OutgoingHttpResponse } from '@stone-js/http-core'
import { ClassType, Event, IListener, OutgoingResponse, OutgoingResponseOptions } from '@stone-js/core'

export type IOutgoingResponse = OutgoingResponse
export type IIncomingHttpEvent = IncomingHttpEvent
export type IOutgoingHttpResponse = OutgoingHttpResponse

export type RouteParams = Record<string, unknown>

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export type IBoundModel = Function & { resolveRouteBinding: (key: string, value: unknown) => Promise<IBoundModel> | IBoundModel }

export type BindingKey = number | boolean | string | Function | object | symbol

export type BindingValue = BindingKey

export type ContainerResolver<V> = (container: IContainer) => V

export type IMatcher = <
  IncomingEventType extends IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse
> (optons: MatcherOptions<IncomingEventType, OutgoingResponseType>) => boolean

export type IDispacher = <
  IncomingEventType extends IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse
> (options: DispatcherOptions<IncomingEventType, OutgoingResponseType>) => Promise<OutgoingResponseType>

export type IDispachers = Record<'callable' | 'controller', IDispacher>

export type RouterAction = RouterCallableAction | RouterClassAction
export type RouterClassAction = Record<string, ClassType> | ClassType
export interface IControllerInstance { [k: PropertyKey]: RouterCallableAction }
export type RouterCallableAction = <
  IncomingEventType extends IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse
> (context: RouterActionContext<IncomingEventType, OutgoingResponseType>) => OutgoingResponseType | Promise<OutgoingResponseType>

export type OutgoingResponseResolver = <
  OptionsType extends OutgoingResponseOptions,
  OutgoingResponseType extends OutgoingResponse
>(options: OptionsType) => OutgoingResponseType | Promise<OutgoingResponseType>

export interface RouterActionContext<IncomingEventType extends IIncomingHttpEvent, OutgoingResponseType extends IOutgoingResponse> {
  body?: unknown
  params: RouteParams
  event: IncomingEventType
  query: Record<string, string>
  route: Route<IncomingEventType, OutgoingResponseType>
}

export type DecoratorRouteDefinition = Omit<RouteDefinition, 'path' | 'action' | 'method' | 'children'>
export type FunctionalRouteDefinition = Omit<RouteDefinition, 'path' | 'methods' | 'method' | 'children'>
export type DecoratorGroupRouteDefinition = Omit<DecoratorRouteDefinition, 'fallback' | 'alias' | 'methods'>
export type FunctionalRouteGroupDefinition = Omit<FunctionalRouteDefinition, 'action' | 'fallback' | 'alias'> & { path: string }

export interface RouteDefinition {
  name?: string
  strict?: boolean
  fallback?: boolean
  method?: HttpMethod
  action?: RouterAction
  methods?: HttpMethod[]
  path: string | string[] // Array for aliases
  middleware?: MixedPipe[]
  isInternalHeader?: boolean
  domain?: string | string[]
  excludeMiddleware?: Pipe[]
  protocol?: string | string[]
  children?: RouteDefinition[]
  rules?: Record<string, RegExp>
  defaults?: Record<string, unknown>
  bindings?: Record<string, Function>
  redirect?: string | Record<string, unknown> | Function
  [k: string]: unknown
}

export interface FlattenedRouteDefinition extends RouteDefinition {
  path: string
  methods?: never
  domain?: string
  protocol?: string
  method: HttpMethod
  children?: FlattenedRouteDefinition[]
}

export interface NavigateOptions {
  name: string
  hash?: string
  query?: Record<string, string>
  params?: Record<string, string>
}

export interface GenerateOptions extends NavigateOptions {
  protocol?: string
  withDomain?: boolean
}

export interface IContainer {
  has: (key: BindingKey) => boolean
  make: <V extends BindingValue>(key: BindingKey) => V
  instance: (key: BindingKey, value: BindingValue) => this
  alias: (key: BindingKey, aliases: string | string[]) => this
  resolve: <V extends BindingValue>(key: BindingKey, singleton?: boolean) => V
  singletonIf: <V extends BindingValue>(key: BindingKey, resolver: ContainerResolver<V>) => this
}

export interface IEventEmitter {
  emit: ((event: Event) => void) & ((event: CustomEvent) => void) & ((event: string, ...args: unknown[]) => void)
  on: ((event: Event, listener: IListener) => void) & ((event: string, listener: IListener) => void) & ((event: CustomEvent, listener: IListener) => void)
}

export interface RouterContext<U extends IIncomingHttpEvent, V extends IOutgoingResponse> {
  event: U
  response?: V
  route: Route<U, V>
}

/**
 * Internal SegmentConstraint type.
 */
export interface RouteSegmentConstraint {
  /**
   * Segment value.
   */
  match: string

  /**
   * Segment prefix value.
   */
  prefix: string

  /**
   * Domain suffix value.
   */
  suffix: string

  /**
   * Param name.
   */
  param: string

  /**
   * Value defined as alias for entity bindings.
   */
  alias: string

  /**
   * Regex rule.
   */
  rule: RegExp

  /**
   * Regex quantifier.
   */
  quantifier: string

  /**
   * Default value for param.
   */
  default: unknown

  /**
   * Indicates if the param is optional.
   */
  optional: boolean
};
