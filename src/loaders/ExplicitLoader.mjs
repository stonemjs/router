import { LogicError } from '@stone-js/common'
import { AbstractLoader } from './AbstractLoader.mjs'

/**
 * Class representing an ExplicitLoader.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @extends AbstractLoader
 */
export class ExplicitLoader extends AbstractLoader {
  #definitions

  /**
   * Create an ExplicitLoader.
   *
   * @param {FlattenMapper} mapper
   * @param {definition[]} definitions
   * @throws {LogicError}
   */
  constructor (mapper, definitions) {
    super(mapper)

    if (!Array.isArray(definitions)) {
      throw new LogicError('definitions must be an array of object.')
    }

    this.#definitions = definitions
  }

  /**
   * Load and return definitions from source.
   *
   * @return {RouteDefinition[]}
   */
  load () {
    return this._flattenMap(this.#definitions)
  }
}
