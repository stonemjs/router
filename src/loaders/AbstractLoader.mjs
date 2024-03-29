import { LogicException } from '@stone-js/common'

/**
 * Class representing an AbstractLoader.
 * Must not be instanciated, must be extended
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @abstract
 */
export class AbstractLoader {
  #mapper

  /**
   * Create an abstractLoader.
   *
   * @param {FlattenMapper} mapper
   */
  constructor (mapper) {
    this.#mapper = mapper
  }

  /**
   * Load definitions from source.
   *
   * @throws {LogicException}
   */
  load () {
    throw new LogicException('Cannot call this abstract method.')
  }

  /**
   * @param {definition[]} definitions
   */
  _flattenMap (definitions) {
    return this.#mapper.flattenMap(definitions)
  }
}
