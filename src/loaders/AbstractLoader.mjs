import { LogicException } from '@stone-js/common'

export class AbstractLoader {
  #mapper

  constructor (mapper) {
    this.#mapper = mapper
  }

  _flattenMap (definitions) {
    return this.#mapper.flattenMap(definitions)
  }

  load () {
    throw new LogicException('Cannot call this abstract method.')
  }
}
