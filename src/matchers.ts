import { Route } from './Route'
import { IIncomingEvent } from './declarations'
import { domainRegex, pathRegex } from './utils'

/**
 * Options for route matchers.
 *
 * @template IncomingEventType - The type representing the incoming HTTP event.
 * @template OutgoingResponseType - The type representing the outgoing HTTP response.
 *
 * @property event - The incoming HTTP event to be matched.
 * @property route - The route definition to match against.
 */
export interface MatcherOptions<IncomingEventType extends IIncomingEvent = IIncomingEvent, OutgoingResponseType = unknown> {
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
export function hostMatcher<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType = unknown
> ({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean {
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
export function methodMatcher<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType = unknown
> ({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean {
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
export function protocolMatcher<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType = unknown
> ({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean {
  if (route.isHttpOnly()) {
    return event.isSecure !== true
  } else if (route.isHttpsOnly()) {
    return event.isSecure === true
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
export function uriMatcher<
  IncomingEventType extends IIncomingEvent = IIncomingEvent,
  OutgoingResponseType = unknown
> ({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean {
  return pathRegex(route.options).test(event.decodedPathname ?? event.pathname)
}
