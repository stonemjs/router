import { RouterCommand } from './RouterCommand.mjs'
import { NODE_CONSOLE_PLATFORM } from '@stone-js/common'

/**
 * Class representing a RoutingCliServiceProvider.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class RoutingCliServiceProvider {
  #container

  /**
   * Create a new instance of RoutingCliServiceProvider.
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
    return this.#container.make('platformName') !== NODE_CONSOLE_PLATFORM
  }

  /**
   * Hook that runs at each events and before everything.
   * Useful to initialize things at each events.
   */
  beforeHandle () {
    const commands = this.#container.config.get('app.commands', [])
    this.#container.config.set('app.commands', commands.concat(RouterCommand))
  }

  /**
   * Register router components in service container.
   *
   * @returns {void}
   */
  register () {}
}
