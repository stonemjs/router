/**
 * Router object options.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */

/**
 * Router options.
 *
 * @typedef  {Object} routerOptions
 * @property {Object} [rules={}]
 * @property {number} [max_depth=5]
 * @property {Object} [defaults={}]
 * @property {boolean} [strict=false]
 * @property {Object} [dispatchers={}]
 * @property {Function[]} [matchers=[]]
 * @property {Function[]} [middleware=[]]
 * @property {definition[]} [definitions=[]]
 * @property {boolean} [middleware_disabled=false]
 */
export const router = {
  rules: {},
  strict: false,
  defaults: {},
  matchers: [],
  max_depth: 5,
  middleware: [],
  definitions: [],
  dispatchers: {},
  skip_middleware: false
}
