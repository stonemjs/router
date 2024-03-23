import { Router } from './Router.mjs'
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

  #registerRouter () {
    this
      .#container
      .singletonIf(Router, container => new Router(container, container.bound('events') ? container.make('events') : null))
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
