import { routerResolver } from '../resolvers'
import { MixedPipe } from '@stone-js/pipeline'
import { RouterErrorHandler } from '../RouterErrorHandler'
import { AppConfig, StoneBlueprint } from '@stone-js/core'
import { routeConfigMiddleware } from '../middleware/configMiddleware'
import { callableDispatcher, controllerDispatcher } from '../dispatchers'
import { hostMatcher, methodMatcher, protocolMatcher, uriMatcher } from '../matchers'
import { IDispachers, IIncomingEvent, IMatcher, IOutgoingResponse, OutgoingResponseResolver, RouteDefinition } from '../declarations'

/**
 * Defines the configuration options for the router.
 */
export interface RouterConfig {
  /** Base path prefix applied to all routes. */
  prefix?: string

  /** Enables strict path matching. */
  strict?: boolean

  /** Maximum depth allowed in route definitions. */
  maxDepth?: number

  /** List of matchers used to validate and match routes. */
  matchers?: IMatcher[]

  /** List of middleware applied during route resolution. */
  middleware?: MixedPipe[]

  /** Skips middleware execution for specific routes. */
  skipMiddleware?: boolean

  /** Dispatchers used for handling callable and controller-based routes. */
  dispatchers?: IDispachers

  /** Custom rules for route matching, defined as regular expressions. */
  rules?: Record<string, RegExp>

  /** Array of route definitions to be included in the router. */
  definitions?: RouteDefinition[]

  /** Default parameter values for routes. */
  defaults?: Record<string, unknown>

  /** Custom function bindings for specific route behaviors. */
  bindings?: Record<string, Function>

  /** Resolver used to create outgoing responses. */
  responseResolver?: OutgoingResponseResolver
}

/**
 * Extends the base application configuration to include router-specific settings.
 */
export interface RouterAppConfig extends Partial<AppConfig<IIncomingEvent, IOutgoingResponse>> {
  /** Router-specific configuration. */
  router: RouterConfig
}

/**
 * Blueprint for defining router-specific behavior and configuration.
 */
export interface RouterBlueprint extends StoneBlueprint<IIncomingEvent, IOutgoingResponse> {
  /** Configuration and behavior definitions for the router application. */
  stone: RouterAppConfig
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
      routerResolver,
      errorHandlers: {
        RouterError: RouterErrorHandler,
        RouteNotFoundError: RouterErrorHandler,
        MethodNotAllowedError: RouterErrorHandler
      }
    },
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
        callable: callableDispatcher,
        controller: controllerDispatcher
      },
      skipMiddleware: false
    }
  }
}
