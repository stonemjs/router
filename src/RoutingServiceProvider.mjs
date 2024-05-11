import { Router } from './Router.mjs'
import { Pipeline } from '@stone-js/pipeline'
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
   * Register router components in service container.
   *
   * @return  {void}
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
    const middleware = route ? router?.gatherRouteMiddleware(route) : []

    await Pipeline
      .create(this.#container)
      .send(event, response)
      .through(middleware)
      .via('terminate')
      .thenReturn()
  }

  #registerRouter () {
    const events = this.#container.bound('events') ? this.#container.make('events') : null
    const options = this.#container.bound('config') ? this.#container.make('config').get('router', {}) : {}

    this
      .#container
      .singletonIf(Router, container => new Router(options, container, events))
      .alias(Router, 'router')

    return this
  }

  #registerDispatchers () {
    this
      .#container
      .singletonIf(CallableDispatcher, container => new CallableDispatcher(container))
      .singletonIf(ComponentDispatcher, container => new ComponentDispatcher(container))
      .singletonIf(ControllerDispatcher, container => new ControllerDispatcher(container))

    return this
  }
}
