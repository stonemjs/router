import { AbstractLoader } from './AbstractLoader.mjs'
import { LogicException, MetaProperty } from '@stone-js/common'

/**
 * Class representing a DecoratorLoader.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @extends AbstractLoader
 */
export class DecoratorLoader extends AbstractLoader {
  #classes

  constructor (mapper, classes) {
    super(mapper)

    if (!Array.isArray(classes)) {
      throw new LogicException('classes must be an array of class.')
    }

    this.#classes = classes
  }

  load () {
    return this._flattenMap(this.#getDefinitions())
  }

  #getDefinitions () {
    return this.#classes.reduce((prev, Class) => {
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

  #getParentDefinition (Class) {
    return (Class.metadata?.decorators ?? Class.prototype.metadata?.decorators ?? {}).route
  }

  #getMethodDefinitions (Class) {
    return Object
      .getOwnPropertyNames(Class.prototype)
      .filter(method => Class.prototype[method] instanceof MetaProperty)
      .map(method => Class.prototype[method].getRouteDecorator())
      .filter(decorator => !!decorator)
  }
}
