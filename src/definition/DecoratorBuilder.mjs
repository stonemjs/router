import { MetaProperty } from '@stone-js/common'
import { DefinitionBuilder } from './DefinitionBuilder.mjs'

/**
 * Class representing a DecoratorBuilder.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @extends DefinitionBuilder
 */
export class DecoratorBuilder extends DefinitionBuilder {
  /**
   * Build route definitions.
   *
   * @param  {Function[]} classes
   * @return {RouteDefinition[]}
   * @throws {TypeError}
   */
  build (classes) {
    return this._flattenMap(this.#getDefinitions(classes))
  }

  /**
   * Get definitions from decorators.
   *
   * @param  {Function[]} class
   * @return {Object[]}
   */
  #getDefinitions (classes) {
    return classes.reduce((prev, Class) => {
      const parent = this.#getParentDefinition(Class)
      const definitions = this.#getMethodDefinitions(Class)

      if (parent) {
        parent.children = definitions
        return prev.concat(parent)
      } else {
        return prev.concat(definitions)
      }
    }, [])
  }

  /**
   * Get definition from class decorators.
   *
   * @param  {Function} class
   * @return {(Object|undefined)}
   */
  #getParentDefinition (Class) {
    const parent = Class.$$metadata$$?.routeGroup
    if (parent) {
      return { ...parent, action: Class }
    }
    return parent
  }

  /**
   * Get definitions from class method decorators.
   *
   * @param  {Function} class
   * @return {Object[]}
   */
  #getMethodDefinitions (Class) {
    return Object
      .getOwnPropertyNames(Class.prototype)
      .filter(prop => prop !== 'constructor')
      .map(method => Class.prototype[method]?.())
      .filter(value => value instanceof MetaProperty)
      .map(value => value.getMetadata().route)
      .filter(definition => !!definition)
  }
}
