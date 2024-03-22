import { LogicException } from '@stone-js/common'
import { AbstractLoader } from './AbstractLoader.mjs'

/**
 * Class representing a ExplicitLoader.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('./RouteDefinition.mjs').definition} definition
 * @typedef {import('../RouteDefinition.mjs').RouteDefinition} RouteDefinition
 * @typedef {import('../mapper/FlattenMapper.mjs').FlattenMapper} FlattenMapper
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
   * @throws {LogicException}
   */
  constructor (mapper, definitions) {
    super(mapper)

    if (!Array.isArray(definitions)) {
      throw new LogicException('definitions must be an array of object.')
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
