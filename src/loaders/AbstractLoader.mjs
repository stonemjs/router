import { RouteDefinition } from '../RouteDefinition.mjs'
import { LogicException } from '../exceptions/LogicException.mjs'

export class AbstractLoader {
  load () {
    return []
  }

  _mapAndValidateDefinitions (definitions) {
    return definitions.reduce((prev, definition) => {
      if (!definition.path) {
        throw new LogicException(`No Path provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.method && !definition.methods) {
        throw new LogicException(`No Methods provided for this route definition ${JSON.stringify(definition)}`)
      } else if (!definition.action) {
        throw new LogicException(`No Action provided for this route definition ${JSON.stringify(definition)}`)
      } else {
        prev.push(new RouteDefinition(definition))
      }

      return prev
    }, [])
  }

  _flattenPath (definition, parent) {
    return (parent.path && definition.path)
      ? `${parent.path}${definition.path}`
      : (parent.path ?? definition.path)
  }

  _flattenDomain (definition, parent) {
    return parent.domain && !definition.domain ? parent.domain : definition.domain
  }

  _flattenAction (definition, parent) {
    const parentAction = Array.isArray(parent.action) ? parent.action[0] : parent.action
    const definitionAction = Array.isArray(definition.action) ? definition.action[0] : definition.action

    if (typeof definitionAction === 'string' && parentAction && /^\s*class/.test(parentAction.toString())) {
      return [parentAction, definitionAction]
    }

    return definition.action ?? parent.action
  }

  _flattenName (definition, parent) {
    return (parent.name && definition.name)
      ? `${parent.name}.${definition.name}`
      : (parent.name ?? definition.name)
  }

  _flattenRules (definition, parent) {
    return Object
      .entries(parent.rules ?? {})
      .reduce((prev, [key, rule]) => {
        if (!prev[key]) {
          if (
            definition.children ||
            this._keyExistsInPath(parent.path, key) ||
            this._keyExistsInPath(definition.path, key)
          ) {
            prev[key] = rule
          }
        }
        return prev
      }, definition.rules ?? {})
  }

  _flattenDefaults (definition, parent) {
    return Object
      .entries(parent.defaults ?? {})
      .reduce((prev, [key, value]) => {
        if (!prev[key]) {
          if (
            definition.children ||
            this._keyExistsInPath(parent.path, key) ||
            this._keyExistsInPath(definition.path, key)
          ) {
            prev[key] = value
          }
        }
        return prev
      }, definition.defaults ?? {})
  }

  _flattenMethods (definition, parent) {
    return [
      ...(parent.methods ?? []),
      ...(definition.methods ?? []),
      ...(parent.method ? [parent.method] : []),
      ...(definition.method ? [definition.method] : [])
    ].reduce((prev, method) => prev.includes(method) ? prev : prev.concat([method]), [])
  }

  _flattenMiddleware (definition, parent) {
    return [
      ...(parent.middleware ?? []),
      ...(definition.middleware ?? [])
    ].reduce((prev, middleware) => prev.includes(middleware) ? prev : prev.concat([middleware]), [])
  }

  _keyExistsInPath (path, key) {
    return new RegExp(`\\/(:(${key})|\\{(${key})\\})`, 'gi').test(path)
  }
}
