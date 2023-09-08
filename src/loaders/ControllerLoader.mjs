import { MetaResponse } from "../MetaResponse.mjs"
import { AbstractLoader } from "./AbstractLoader.mjs"

export class ControllerLoader extends AbstractLoader {
  #controllers

  constructor(controllers) {
    super()
    this.#controllers = controllers
  }

  load () {
    return this._getDefinitions()
  }

  _getDefintions () {
    const flattenDefinitions = []

    for (const controllerClass of this.#controllers) {
      const parent = this._getParentDefinition(controllerClass)
      const metaResponses = this._getMetaResponses(controllerClass)
      for (const metaResponse of metaResponses) {
        const definition = metaResponse.getRouteDecorator()
        definition && flattenDefinitions.push(this._flattenDefinition(definition, parent))
      }
    }

    return this._mapAndValidateDefinitions(flattenDefinitions)
  }

  _flattenDefinition (definition, parent) {
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
    
    return definition
  }

  _getMetaResponses (controller) {
    return Object.getOwnPropertyNames(controller.prototype).filter(name => controller[name] instanceof MetaResponse)
  }

  _getParentDefinition (controller) {
    return (controller.metadata ?? controller.prototype.metadata ?? {}).route
  }
}