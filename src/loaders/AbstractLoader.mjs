import { LogicException } from '@stone-js/common'
import { RouteDefinitionParser } from '../parser/RouteDefinitionParser.mjs'

export class AbstractLoader {
  #parser

  constructor({ maxDepth = 5 }) {
    this.#parser = new RouteDefinitionParser({ maxDepth })
  }

  _parser (definitions) {
    return this.#parser.parse(definitions)
  }

  load () {
    throw LogicException('Cannot call this abstract method.')
  }
}
