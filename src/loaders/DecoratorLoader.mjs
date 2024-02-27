import { AbstractLoader } from './AbstractLoader.mjs'
import { MetaResponse, LogicException } from '@stone-js/common'

export class DecoratorLoader extends AbstractLoader {
  #classes

  constructor ({ classes, maxDepth = 5 }) {
    super({ maxDepth })

    if (!Array.isArray(classes)) {
      throw LogicException('classes must be an array of class.')
    }

    this.#classes = classes
  }

  load () {
    return this._parser(this.#getDefinitions())
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
    return (Class.metadata ?? Class.prototype.metadata ?? {}).route
  }

  #getMethodDefinitions (Class) {
    return Object
      .getOwnPropertyNames(Class.prototype)
      .filter(method => Class.prototype[method] instanceof MetaResponse)
      .map(meta => meta.getRouteDecorator())
  }
}
