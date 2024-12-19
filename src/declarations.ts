import { Route } from "./Route";
import { MatcherOptions } from "./matchers";
import { MixedPipe } from "@stone-js/pipeline";
import { DispatcherOptions } from "./dispatchers";
import { ClassType, Event, IListener } from "@stone-js/core";

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export interface IIncomingEvent {
  getUri: (withDomain?: boolean) => string;
  url: URL;
  host: string
  hash: string;
  body?: unknown;
  isSecure: boolean;
  method: HttpMethod;
  decodedPathname: string;
  query: Record<string, string>;
  isMethod: (method: HttpMethod) => boolean;
  setRouteResolver: (resolver: () => Route) => this;
}

export interface IOutgoingResponse {}

export type RouteParams = Record<string, string>

export type RouteType = Route<IIncomingEvent, IOutgoingResponse>

export interface NavigateOptions {
  name: string
  hash?: string
  params?: RouteParams
  query?: Record<string, string>
}

export interface GenerateOptions extends NavigateOptions {
  protocol?: string
  withDomain?: boolean
}

export type BindingKey = number | boolean | string | Function | object | symbol

export type BindingValue = BindingKey

export type ContainerResolver<V> = (container: IContainer) => V;

export interface IContainer {
  has(key: BindingKey): boolean;
  make<V extends BindingValue>(key: BindingKey): V;
  instance (key: BindingKey, value: BindingValue): this
  alias (key: BindingKey, aliases: string | string[]): this
  resolve<V extends BindingValue>(key: BindingKey, singleton?: boolean): V 
  singletonIf<V extends BindingValue>(key: BindingKey, resolver: ContainerResolver<V>): this;
}

export interface IEventEmitter {
  emit (event: Event): void
  emit (event: CustomEvent): void
  emit (event: string, ...args: unknown[]): void
  on (event: Event, listener: IListener): void
  on (event: string, listener: IListener): void
  on (event: CustomEvent, listener: IListener): void
}

export interface BoundEntity extends ClassType {
  resolveRouteBinding (key: string, value: unknown): BoundEntity
}

export type RouterClassAction = Record<string, ClassType> | ClassType
export type RouterComponentAction = Record<string, object> | RouterClassAction
export type RouterCallableAction = (event: IIncomingEvent) => IOutgoingResponse
export type RouterAction = RouterCallableAction | RouterClassAction | RouterComponentAction

export type FunctionalRouteDefinition = Omit<RouteDefinition, 'path' | 'methods' | 'method' | 'children'>
export type FunctionalRouteGroupDefinition = Omit<FunctionalRouteDefinition, 'redirect' | 'action' | 'fallback' | 'alias'> & { path: string }

export type DecoratorRouteDefinition = Omit<RouteDefinition, 'path' | 'action' | 'method' | 'children'>
export type DecoratorGroupRouteDefinition = Omit<DecoratorRouteDefinition, 'redirect' | 'fallback' | 'alias' | 'methods'>

export interface RouteDefinition {
  name?: string;
  strict?: boolean;
  fallback?: boolean;
  method?: HttpMethod;
  throttle?: Function[];
  action?: RouterAction;
  methods?: HttpMethod[];
  path: string | string[]; // Array for aliases
  middleware?: MixedPipe[];
  isInternalHeader?: boolean;
  domain?: string | string[];
  protocol?: string | string[];
  children?: RouteDefinition[];
  rules?: Record<string, RegExp>;
  excludeMiddleware?: MixedPipe[];
  defaults?: Record<string, unknown>;
  bindings?: Record<string, Function>;
  redirect?: string | Record<string, string> | Function;
  [k: string]: unknown;
}

export interface FlattenedRouteDefinition extends Omit<RouteDefinition, 'methods' | 'method'> {
  path: string
  domain?: string
  protocol?: string
  method: HttpMethod;
  children?: FlattenedRouteDefinition[];
}

export interface RouterContext<U extends IIncomingEvent, V extends IOutgoingResponse> {
  event: U
  response?: V
  route: Route<U, V>
}

export type IMatcher = <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> (optons: MatcherOptions<Route<IncomingEventType, OutgoingResponseType>, IncomingEventType>) => boolean

export type IDispacher = <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> (options: DispatcherOptions<IncomingEventType, OutgoingResponseType>) => Promise<OutgoingResponseType>

export type IDispachers = Record<'callable' | 'controller', IDispacher>;

/**
 * Internal SegmentConstraint type.
 */
export type RouteSegmentConstraint = {
  /**
   * Segment value.
   */
  match: string;

  /**
   * Segment prefix value.
   */
  prefix: string;

  /**
   * Domain suffix value.
   */
  suffix: string;

  /**
   * Param name.
   */
  param: string;

  /**
   * Value defined as alias for entity bindings.
   */
  alias: string;

  /**
   * Regex rule.
   */
  rule: RegExp;

  /**
   * Regex quantifier.
   */
  quantifier: string;

  /**
   * Default value for param.
   */
  default: unknown;

  /**
   * Indicates if the param is optional.
   */
  optional: boolean;
};
