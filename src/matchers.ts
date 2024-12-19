import { domainRegex, pathRegex } from "./utils"
import { IIncomingEvent, RouteType } from "./declarations"

export interface MatcherOptions<TRoute extends RouteType, TEvent extends IIncomingEvent> {
  route: TRoute
  event: TEvent
}

export const hostMatcher = <TRoute extends RouteType, TEvent extends IIncomingEvent>({ route, event }: MatcherOptions<TRoute, TEvent>): boolean => {
  return domainRegex(route.options) === undefined || domainRegex(route.options)?.test(event.host) === true
}

export const methodMatcher = <TRoute extends RouteType, TEvent extends IIncomingEvent>({ route, event }: MatcherOptions<TRoute, TEvent>): boolean => {
  return route.getOption('method') === event.method
}

export const protocolMatcher = <TRoute extends RouteType, TEvent extends IIncomingEvent>({ route, event }: MatcherOptions<TRoute, TEvent>): boolean => {
  if (route.isHttpOnly()) {
    return event.isSecure === false
  } else if (route.isHttpsOnly()) {
    return event.isSecure === true
  } else {
    return true
  }
}

export const uriMatcher = <TRoute extends RouteType, TEvent extends IIncomingEvent>({ route, event }: MatcherOptions<TRoute, TEvent>): boolean => {
  return pathRegex(route.options).test(event.decodedPathname)
}