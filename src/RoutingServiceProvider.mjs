import { Router } from './Router.mjs'
import { Pipeline } from '@stone-js/pipeline'
import { NODE_CONSOLE_PLATFORM } from '@stone-js/common'
import { CallableDispatcher } from './dispatchers/CallableDispatcher.mjs'
import { ComponentDispatcher } from './dispatchers/ComponentDispatcher.mjs'
import { ControllerDispatcher } from './dispatchers/ControllerDispatcher.mjs'

/**
 * Class representing a RoutingServiceProvider.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class RoutingServiceProvider {
  #container

  /**
   * Create a new instance of RoutingServiceProvider.
   *
   * @param {external:Container} container
   */
  constructor (container) {
    this.#container = container
  }

  /**
   * Skip this provider.
   * Useful to register your provider based on platform.
   *
   * @returns {boolean}
   */
  mustSkip () {
    return this.#container.make('platformName') === NODE_CONSOLE_PLATFORM
  }

  /**
   * Register router components in service container.
   *
   * @returns {void}
   */
  register () {
    this
      .#registerRouter()
      .#registerDispatchers()
  }

  /**
   * Hook that runs just before of just after returning the response.
   * Useful to make some cleanup.
   * Invoke router and current route terminate middlewares.
   */
  async onTerminate () {
    const event = this.#container.bound('event') ? this.#container.make('event') : null
    const router = this.#container.bound('router') ? this.#container.make('router') : null
    const response = this.#container.bound('response') ? this.#container.make('response') : null

    const route = event?.route?.()
    const middleware = (route ? router?.gatherRouteMiddleware?.(route) : [])
      .filter(mid => mid.prototype?.terminate || mid.pipe?.prototype.terminate)

    if (middleware.length) {
      await Pipeline
        .create(this.#container)
        .send({ event, response })
        .through(middleware)
        .via('terminate')
        .thenReturn()
    }
  }

  /**
   * Register router in service container.
   *
   * @returns {this}
   */
  #registerRouter () {
    // Get EventEmitter instance and router options.
    const events = this.#container.bound('events') ? this.#container.make('events') : null
    const options = this.#container.bound('config') ? this.#container.make('config').get('router', {}) : {}

    this
      .#container
      .singletonIf(Router, container => new Router(options, container, events))
      .alias(Router, 'router')

    return this
  }

  /**
   * Register dispatchers in service container.
   *
   * @returns {this}
   */
  #registerDispatchers () {
    this
      .#container
      .singletonIf(CallableDispatcher, container => new CallableDispatcher(container))
      .singletonIf(ComponentDispatcher, container => new ComponentDispatcher(container))
      .singletonIf(ControllerDispatcher, container => new ControllerDispatcher(container))

    return this
  }
}
