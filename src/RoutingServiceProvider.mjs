import { Router } from './Router.mjs'
import { CallableDispatcher } from './dispatchers/CallableDispatcher.mjs'
import { ComponentDispatcher } from './dispatchers/ComponentDispatcher.mjs'
import { ControllerDispatcher } from './dispatchers/ControllerDispatcher.mjs'

export class RoutingServiceProvider {
  #container

  /**
   * The Container class.
   *
   * @external Container
   * @see {@link https://github.com/stonemjs/service-container/blob/main/src/Container.mjs|Container}
   */

  /**
   * Create a new instance of RoutingServiceProvider.
   *
   * @param  {Container} container
   */
  constructor (container) {
    this.#container = container
  }

  register () {
    this
      .#registerRouter()
      .#registerDispatchers()
  }

  #registerRouter () {
    this
      .#container
      .singletonIf(Router, container => new Router({ container, eventManager: container.bound('events') ? container.make('events') : null }))
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
