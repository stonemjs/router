import { RouterErrorHandler } from '../RouterErrorHandler'
import { RouterServiceProvider } from '../RouterServiceProvider'
import { RouterOptions, StoneIncomingEvent } from '../declarations'
import { routeConfigMiddleware } from '../middleware/configMiddleware'
import { AppConfig, OutgoingResponse, StoneBlueprint } from '@stone-js/core'
import { hostMatcher, methodMatcher, protocolMatcher, uriMatcher } from '../matchers'
import { callableDispatcher, componentDispatcher, handlerDispatcher } from '../dispatchers'

/**
 * Defines the configuration options for the router.
 */
export interface RouterConfig<
  IncomingEventType extends StoneIncomingEvent = StoneIncomingEvent,
  OutgoingResponseType extends OutgoingResponse = OutgoingResponse
> extends RouterOptions<IncomingEventType, OutgoingResponseType> {}

/**
 * Extends the base application configuration to include router-specific settings.
 */
export interface RouterAppConfig<
  IncomingEventType extends StoneIncomingEvent = StoneIncomingEvent,
  OutgoingResponseType extends OutgoingResponse = OutgoingResponse
> extends Partial<AppConfig<IncomingEventType, OutgoingResponseType>> {
  /** Router-specific configuration. */
  router: RouterConfig<IncomingEventType, OutgoingResponseType>
}

/**
 * Blueprint for defining router-specific behavior and configuration.
 */
export interface RouterBlueprint<
  IncomingEventType extends StoneIncomingEvent = StoneIncomingEvent,
  OutgoingResponseType extends OutgoingResponse = OutgoingResponse
> extends StoneBlueprint<IncomingEventType, OutgoingResponseType> {
  /** Configuration and behavior definitions for the router application. */
  stone: RouterAppConfig<IncomingEventType, OutgoingResponseType>
}

/**
 * Default blueprint configuration for the router.
 */
export const routerBlueprint: RouterBlueprint = {
  stone: {
    builder: {
      middleware: routeConfigMiddleware
    },
    kernel: {
      errorHandlers: {
        RouterError: {
          isClass: true,
          module: RouterErrorHandler
        },
        RouteNotFoundError: {
          isClass: true,
          module: RouterErrorHandler
        },
        MethodNotAllowedError: {
          isClass: true,
          module: RouterErrorHandler
        }
      }
    },
    providers: [
      RouterServiceProvider
    ],
    router: {
      rules: {},
      maxDepth: 5,
      defaults: {},
      bindings: {},
      strict: false,
      matchers: [
        uriMatcher,
        hostMatcher,
        methodMatcher,
        protocolMatcher
      ],
      middleware: [],
      definitions: [],
      dispatchers: {
        handler: handlerDispatcher,
        callable: callableDispatcher,
        component: componentDispatcher
      },
      skipMiddleware: false
    }
  }
}
