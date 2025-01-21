import { Route } from './Route'
import { domainRegex, pathRegex } from './utils'
import { IIncomingEvent, IMatcher, IOutgoingResponse } from './declarations'

/**
 * Options for route matchers.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @property event - The incoming HTTP event to be matched.
 * @property route - The route definition to match against.
 */
export interface MatcherOptions<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> {
  event: IncomingEventType
  route: Route<IncomingEventType, OutgoingResponseType>
}

/**
 * Matches the host of an incoming HTTP event against a route's host configuration.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @param options - The matcher options containing the route and event.
 * @returns `true` if the host matches or if no specific host is configured.
 *
 * @example
 * ```typescript
 * const match = hostMatcher({ route, event });
 * console.log(match); // true or false
 * ```
 */
export const hostMatcher: IMatcher = <
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  return domainRegex(route.options) === undefined || domainRegex(route.options)?.test(event.host) === true
}

/**
 * Matches the HTTP method of an incoming HTTP event against a route's method configuration.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @param options - The matcher options containing the route and event.
 * @returns `true` if the method matches, otherwise `false`.
 *
 * @example
 * ```typescript
 * const match = methodMatcher({ route, event });
 * console.log(match); // true or false
 * ```
 */
export const methodMatcher: IMatcher = <
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  return route.getOption('method') === event.method
}

/**
 * Matches the protocol (HTTP or HTTPS) of an incoming HTTP event against a route's configuration.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @param options - The matcher options containing the route and event.
 * @returns `true` if the protocol matches the route's requirements, otherwise `false`.
 *
 * @example
 * ```typescript
 * const match = protocolMatcher({ route, event });
 * console.log(match); // true or false
 * ```
 */
export const protocolMatcher: IMatcher = <
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  if (route.isHttpOnly()) {
    return !event.isSecure
  } else if (route.isHttpsOnly()) {
    return event.isSecure
  } else {
    return true
  }
}

/**
 * Matches the URI of an incoming HTTP event against a route's path configuration.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @param options - The matcher options containing the route and event.
 * @returns `true` if the URI matches the route's configuration, otherwise `false`.
 *
 * @example
 * ```typescript
 * const match = uriMatcher({ route, event });
 * console.log(match); // true or false
 * ```
 */
export const uriMatcher: IMatcher = <
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  return pathRegex(route.options).test(event.decodedPathname ?? event.pathname)
}
