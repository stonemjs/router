import { AbstractLoader } from './AbstractLoader.mjs'

export class DefinitionLoader extends AbstractLoader {
  #rawDefinitions
  #flattenDefinitions

  constructor (rawDefinitions) {
    super()
    this.#flattenDefinitions = []
    this.#rawDefinitions = rawDefinitions
  }

  load () {
    return this._getDefinitions()
  }

  _getDefinitions () {
    return this
      ._flattenDefinition(this.#rawDefinitions)
      ._mapAndValidateDefinitions(this.#flattenDefinitions)
  }

  _flattenDefinition (definition, parent = null) {
    if (parent) {
      definition.uri = this._flattenUri(definition, parent)
      definition.name = this._flattenName(definition, parent)
      definition.rules = this._flattenRules(definition, parent)
      definition.action = this._flattenAction(definition, parent)
      definition.domain = this._flattenDomain(definition, parent)
      definition.methods = this._flattenMethods(definition, parent)
      definition.defaults = this._flattenDefaults(definition, parent)
      definition.middleware = this._flattenMiddleware(definition, parent)
    }

    if (definition.children) {
      for (const child of definition.children) {
        this._flattenDefinition(child, definition)
      }
      return this
    }

    this.#flattenDefinitions.push(definition)

    return this
  }
}
