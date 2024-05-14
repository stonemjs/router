import { merge } from '@stone-js/common'

/**
 * Passable.
 *
 * @typedef  {Object} Passable
 * @property {Object} app
 * @property {Object} options
 * @property {Object} commands
 */

/**
 * Handle Router config decorator.
 * Must be the first router pipe, in the no router config exists.
 * It will make the router config file.
 *
 * @param   {Passable} passable - Input data to transform via middleware.
 * @param   {Function} next - Pass to next middleware.
 * @returns {Passable}
 */
export const RouterPipe = (passable, next) => {
  const module = passable.app.find(module => module.$$metadata$$?.router)
  const options = module?.$$metadata$$?.router ?? {}
  passable.options = merge(options, passable.options ?? {})
  return next(passable)
}

/**
 * Handle Controller decorator.
 *
 * @param   {Passable} passable - Input data to transform via middleware.
 * @param   {Function} next - Pass to next middleware.
 * @returns {Passable}
 */
export const ControllerPipe = (passable, next) => {
  if (!passable.options.router) {
    throw new TypeError('No router options found in controller pipe. You must configure the router before.')
  }
  const modules = passable.app.filter(module => module.$$metadata$$?.controller)
  passable.options.router.definitions = modules.concat(passable.options.router.definitions)
  return next(passable)
}

/** @returns {Array} */
export const routerPipes = [RouterPipe, ControllerPipe]
