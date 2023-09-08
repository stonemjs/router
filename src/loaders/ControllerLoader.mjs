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
      const controller = this._getControllerInstance(controllerClass)
      const methods = this._getControllerMethods(controller)
      const parent = this._getParentDefinition(controller)
      for (const method of methods) {
        const definition = this._getMethodDefinition(controller, method)
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

  _getControllerMethods (controller) {
    return Object.getOwnPropertyNames(controller).filter(method => typeof controller[method] === 'function')
  }

  _getMethodDefinition (controller, method) {
    try {
      const response = controller[method]({})
      return (response.metadata ?? {}).route
    } catch (_e) {
      return null
    }
  }

  _getParentDefinition (controller) {
    return (controller.metadata ?? {}).route
  }

  _getControllerInstance (Controller) {
    return new Controller({})
  }
}