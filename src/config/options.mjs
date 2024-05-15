import { routerPipes } from './pipes.mjs'
import { RoutingServiceProvider } from '@stone-js/router'

/**
 * Router object options.
 *
 * @returns {Object}
 */
export const routerOptions = {
  // Router namespace.
  router: {
    // Here you can define global rules for all routes.
    rules: {},

    // Here you can define global prefix for all routes.
    prefix: null,

    // Here you can decide to have strict route path or not.
    strict: false,

    // Here you can define the children definition depth.
    maxDepth: 5,

    // Here you can define global defaults values for all routes.
    defaults: {},

    // Here you can add routes matchers.
    matchers: [],

    // Here you can define global middleware for all routes.
    middleware: [],

    // Here you can define routes defintions.
    // Useful to import your explicit routes modules.
    definitions: [],

    // Here you can define action dispatchers.
    dispatchers: {},

    // Here you can decide to skip middleware.
    skipMiddleware: false
  },

  // Config/Options builder namespace.
  builder: {

    // Here you can define pipes to build the app options.
    pipes: routerPipes
  },

  // App namespace.
  app: {

    // Here you can register providers for all adapters.
    // The service providers listed here will be automatically loaded at each event to your application.
    providers: [RoutingServiceProvider]
  }
}
