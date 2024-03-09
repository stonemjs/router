import { LogicException } from '@stone-js/common'
import { AbstractLoader } from './AbstractLoader.mjs'

export class ExplicitLoader extends AbstractLoader {
  #definitions

  constructor (mapper, definitions) {
    super(mapper)

    if (!Array.isArray(definitions)) {
      throw new LogicException('definitions must be an array of object.')
    }

    this.#definitions = definitions
  }

  load () {
    return this._flattenMap(this.#definitions)
  }
}
