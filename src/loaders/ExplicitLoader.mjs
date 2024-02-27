import { LogicException } from '@stone-js/common'
import { AbstractLoader } from './AbstractLoader.mjs'

export class ExplicitLoader extends AbstractLoader {
  #definitions

  constructor ({ definitions, maxDepth = 5 }) {
    super({ maxDepth })

    if (!Array.isArray(definitions)) {
      throw LogicException('definitions must be an array of object.')
    }

    this.#definitions = definitions
  }

  load () {
    return this._parser(this.#definitions)
  }
}
