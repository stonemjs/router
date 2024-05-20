import { HTTP_METHODS } from '@stone-js/event-foundation'
import { isString, isConstructor } from '@stone-js/common'

/**
 * Prepend path definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependPath = (parent, child, next) => {
  child.path = `/${parent.path ?? ''}/${child.path ?? ''}`.replace(/\/{2,}/g, '/')

  return next(parent, child)
}

/**
 * Prepend name definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependName = (parent, child, next) => {
  child.name = `${parent.name ?? ''}.${child.name ?? ''}`.replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '')

  return next(parent, child)
}

/**
 * Prepend domain definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependDomain = (parent, child, next) => {
  child.domain ??= parent.domain

  return next(parent, child)
}

/**
 * Prepend methods definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependMethods = (parent, child, next) => {
  child.methods = []
    .concat(parent.methods, parent.method, child.methods, child.method)
    .reduce((prev, method) => !HTTP_METHODS.includes(method) || prev.includes(method) ? prev : prev.concat(method), [])

  return next(parent, child)
}

/**
 * Prepend all Array props definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependArrayProp = (parent, child, next) => { // For middleware, throttle and any other custom array props
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

/**
 * Prepend bindings definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependBindings = (parent, child, next) => {
  child.bindings = { ...parent.bindings, ...child.bindings }

  return next(parent, child)
}

/**
 * Prepend rules definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependRules = (parent, child, next) => {
  child.rules = { ...parent.rules, ...child.rules }

  return next(parent, child)
}

/**
 * Prepend defaults definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependDefaults = (parent, child, next) => {
  child.defaults = { ...parent.defaults, ...child.defaults }

  return next(parent, child)
}

/**
 * Prepend actions definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependActions = (parent, child, next) => {
  child.actions = { ...parent.actions, ...child.actions }

  return next(parent, child)
}

/**
 * Prepend action definition.
 *
 * @param   {definition} parent - Parent definition.
 * @param   {definition} child - Child definition.
 * @param   {Function} next - Pass to next middleware.
 * @returns {definition}
 */
export const prependAction = (parent, child, next) => {
  if (!child.action && (parent.action || parent._action)) {
    child._action = parent.action ?? parent._action // Deep down action to children
  }

  if (isString(child.action) && isConstructor(parent.action ?? parent._action)) {
    child.action = { [child.action]: parent.action ?? parent._action }
  } else if ((parent.action || parent._action) && child.action) {
    child.action = [].concat(parent.action ?? parent._action, child.action)
  }

  return next(parent, child)
}
