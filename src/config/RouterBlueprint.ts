import { routerResolver } from '../resolvers'
import { MixedPipe } from '@stone-js/pipeline'
import { AppConfig, StoneBlueprint } from '@stone-js/core'
import { RoutingServiceProvider } from '../RoutingServiceProvider'
import { routeConfigMiddleware } from '../middleware/configMiddleware'
import { callableDispatcher, controllerDispatcher } from '../dispatchers'
import { hostMatcher, methodMatcher, protocolMatcher, uriMatcher } from '../matchers'
import { IDispachers, IIncomingHttpEvent, IMatcher, IOutgoingHttpResponse, OutgoingResponseResolver, RouteDefinition } from '../declarations'

export interface RouterConfig {
  prefix?: string
  strict: boolean
  maxDepth: number
  matchers: IMatcher[]
  middleware: MixedPipe[]
  skipMiddleware: boolean
  dispatchers: IDispachers
  rules: Record<string, RegExp>
  definitions: RouteDefinition[]
  defaults: Record<string, unknown>
  bindings: Record<string, Function>
  responseResolver?: OutgoingResponseResolver
}

export interface RouterAppConfig extends Partial<AppConfig<IIncomingHttpEvent, IOutgoingHttpResponse>> {
  router: RouterConfig
}

export interface RouterBlueprint extends StoneBlueprint<IIncomingHttpEvent, IOutgoingHttpResponse> {
  stone: RouterAppConfig
}

export const routerBlueprint: RouterBlueprint = {
  stone: {
    builder: {
      middleware: routeConfigMiddleware
    },
    kernel: {
      routerResolver
    },
    router: {
      rules: {},
      strict: false,
      maxDepth: 5,
      defaults: {},
      bindings: {},
      matchers: [
        uriMatcher,
        hostMatcher,
        methodMatcher,
        protocolMatcher
      ],
      middleware: [],
      definitions: [],
      dispatchers: {
        callable: callableDispatcher,
        controller: controllerDispatcher
      },
      skipMiddleware: false
    },
    providers: [
      RoutingServiceProvider
    ]
  }
}
