/**
 * Class representing a DefinitionBuilder.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class DefinitionBuilder {
  #mapper

  /**
   * Create a DefinitionBuilder.
   *
   * @param {FlattenMapper} mapper
   */
  constructor (mapper) {
    this.#mapper = mapper
  }

  /**
   * Build route definitions.
   *
   * @param   {definition[]} definitions
   * @returns {RouteDefinition[]}
   * @throws  {TypeError}
   */
  build (definitions) {
    return this._flattenMap(definitions)
  }

  /**
   * Flatten map route definitions.
   *
   * @param   {definition[]} definitions
   * @returns {RouteDefinition[]}
   * @throws  {TypeError}
   */
  _flattenMap (definitions) {
    if (Array.isArray(definitions)) {
      return this.#mapper.flattenMap(definitions)
    }

    throw new TypeError('definitions must be an array of object.')
  }
}
