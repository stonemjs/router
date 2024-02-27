import { isString, isClass, HTTP_METHODS } from "@stone-js/common"

export const appendPath = (parent, child, next) => {
  child.path = `${parent.path ?? ''}/${child.path ?? ''}`.replace(/\/+/g, '/')

  return next(parent, child)
}

export const appendName = (parent, child, next) => {
  child.name = `${parent.name ?? ''}.${child.name ?? ''}`.replace(/\.+/g, '/')

  return next(parent, child)
}

export const appendDomain = (parent, child, next) => {
  child.domain ??= parent.domain

  return next(parent, child)
}

export const appendMethods = (parent, child, next) => {
  child.methods = []
    .concat(parent.methods, parent.method, child.methods, child.method)
    .reduce((prev, method) => !HTTP_METHODS.includes(method) || prev.includes(method) ? prev : prev.concat(method), [])
  
  return next(parent, child)
}

export const appendArrayProp = (parent, child, next) => { // For middleware, throttle and any other custom array props
  const props = []
    .concat(Object.keys(parent), Object.keys(child))
    .filter(v => !['methods', 'alias', 'children'].includes(v) && (Array.isArray(parent[v]) || Array.isArray(child[v])))
  
  for (const prop of props) {
    child[prop] = []
      .concat(parent[prop], child[prop])
      .reduce((prev, item) => !item || prev.includes(item) ? prev : prev.concat(item), [])
  }

  return next(parent, child)
}

export const appendBindings = (parent, child, next) => {
  child.bindings = { ...parent.bindings, ...child.bindings }

  return next(parent, child)
}

export const appendRules= (parent, child, next) => {
  child.rules = { ...parent.rules, ...child.rules }

  return next(parent, child)
}

export const appendDefaults = (parent, child, next) => {
  child.defaults = { ...parent.defaults, ...child.defaults }

  return next(parent, child)
}

export const appendActions = (parent, child, next) => {
  child.actions = { ...parent.actions, ...child.actions }

  return next(parent, child)
}

export const appendAction = (parent, child, next) => {
  if (!child.action && parent.action) {
    child._action = parent.action // Deep down action to children
  }

  if (isString(child.action) && isClass(parent.action ?? parent._action)) {
    child.action = { [child.action]: parent.action ?? parent._action }
  } else if ((parent.action || parent._action) && child.action) {
    child.action = [].concat(parent.action ?? parent._action, child.action)
  }

  return next(parent, child)
}