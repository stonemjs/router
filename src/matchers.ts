import { Route } from './Route'
import { domainRegex, pathRegex } from './utils'
import { IIncomingHttpEvent, IOutgoingHttpResponse, IOutgoingResponse } from './declarations'

export interface MatcherOptions<
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
> {
  event: IncomingEventType
  route: Route<IncomingEventType, OutgoingResponseType>
}

export const hostMatcher = <
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  return domainRegex(route.options) === undefined || domainRegex(route.options)?.test(event.host) === true
}

export const methodMatcher = <
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  return route.getOption('method') === event.method
}

export const protocolMatcher = <
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  if (route.isHttpOnly()) {
    return !event.isSecure
  } else if (route.isHttpsOnly()) {
    return event.isSecure
  } else {
    return true
  }
}

export const uriMatcher = <
  IncomingEventType extends IIncomingHttpEvent = IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingHttpResponse
>({ route, event }: MatcherOptions<IncomingEventType, OutgoingResponseType>): boolean => {
  return pathRegex(route.options).test(event.decodedPathname ?? event.pathname)
}
