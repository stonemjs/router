import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { RouteDefinition } from './definition/RouteDefinition.mjs'
import { HttpError, isPlainObject, isFunction, isConstructor, isNumeric, isBrowser, RuntimeError } from '@stone-js/common'

/**
 * Class representing a Route.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class Route {
  #router
  #matchers
  #container
  #parameters
  #definition
  #dispatchers

  #hash
  #query
  #parameterNames
  #domainConstraints
  #segmentConstraints

  static pathConstraintRegex = /^(.+?)?[:{](.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)(?:=(.+?))?\}?$/
  static domainConstraintRegex = /^(?:\{(.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)(?:=(.+?))?\})?(.+)$/

  /**
   * Create a route.
   *
   * @param  {RouteDefinition} routeDefinition
   * @return {Route}
   */
  static create (routeDefinition) {
    return new this(routeDefinition)
  }

  /**
   * Create a route.
   *
   * @param  {RouteDefinition} routeDefinition
   * @throws {TypeError}
   */
  constructor (routeDefinition) {
    if (!(routeDefinition instanceof RouteDefinition)) {
      throw new TypeError("This method's parameter must be an instance of `RouteDefinition`")
    }

    this.#matchers = []
    this.#dispatchers = {}
    this.#definition = routeDefinition
  }

  /** @return {string} */
  get uri () {
    return `${this.domain ?? ''}${this.path}`
  }

  /** @return {string[]} */
  get alias () {
    return [].concat(this.get('alias', []))
  }

  /** @return {string} */
  get path () {
    return `/${this.get('path', '').trim()}`.replaceAll(/\/+/g, '/')
  }

  /** @return {string} */
  get domain () {
    return this.get('domain')?.replace(/^https?:\/\//, '') ?? null
  }

  /** @return {string[]} */
  get methods () {
    return this.#definition.getMethods()
  }

  /** @return {*} */
  get action () {
    return this.get('action')
  }

  /** @return {string} */
  get name () {
    return this.get('name')
  }

  /** @return {Object} */
  get rules () {
    return this.get('rules', {})
  }

  /** @return {Object} */
  get defaults () {
    return this.get('defaults', {})
  }

  /** @return {string} */
  get protocol () {
    return this.get('protocol')
  }

  /** @return {boolean} */
  get isFallback () {
    return this.get('fallback', false)
  }

  /** @return {boolean} */
  get isStrict () {
    return this.get('strict', false)
  }

  /** @return {Function[]} */
  get middleware () {
    return this.get('middleware', [])
  }

  /** @return {Function[]} */
  get excludeMiddleware () {
    return this.get('excludeMiddleware', [])
  }

  /** @return {Object<string,*>} */
  get params () {
    return this.parameters()
  }

  /** @return {Object<string,*>} */
  get query () {
    return this.#query ?? {}
  }

  /** @return {string} */
  get hash () {
    return this.#hash
  }

  /**
   * Get any value defined in raw definition.
   * Can be used to get custom value defined in raw defintion.
   *
   * @param  {string} key
   * @param  {*} [fallback=null] return default value when not found.
   * @return {*}
   */
  get (key, fallback = null) {
    return this.#definition.get(key, fallback)
  }

  /**
   * Check if the event matches the route.
   *
   * @param  {IncomingEvent} event
   * @param  {boolean} [includingMethod=true]
   * @return {boolean}
   */
  matches (event, includingMethod = true) {
    const matchers = this.getMatchers().filter(matcher => !(!includingMethod && matcher instanceof MethodMatcher))
    for (const matcher of matchers) {
      if (!matcher.matches(this, event)) {
        return false
      }
    }
    return true
  }

  /**
   * Bind event to route and retrieve params.
   *
   * @param  {IncomingEvent} event
   * @return {this}
   */
  async bind (event) {
    this.#hash = event.hash
    this.#query = event.query
    this.#parameters = await this.#bindParameters(event)
    return this
  }

  /**
   * Execute and return route action.
   *
   * @param  {IncomingEvent} event
   * @return {*}
   * @throws {TypeError}
   */
  run (event) {
    if (this.#definition.has('redirect')) {
      return this.#runRedirection(event, this.get('redirect'))
    } else if (isBrowser()) {
      return this.#runComponent(event)
    } else if (this.isControllerAction()) {
      return this.#runController(event)
    } else if (this.isCallableAction()) {
      return this.#runCallable(event)
    } else {
      throw new TypeError('Invalid action provided.')
    }
  }

  /**
   * Check if route contains params.
   *
   * @return {boolean}
   */
  hasParameters () {
    return !!this.#parameters
  }

  /**
   * Check if route contains specific param.
   *
   * @param  {string} name
   * @return {boolean}
   */
  hasParameter (name) {
    return this.hasParameters() && !!this.#parameters[name]
  }

  /**
   * Get all route parameters.
   *
   * @return {Object}
   * @throws {RuntimeError}
   */
  parameters () {
    if (this.hasParameters()) {
      return this.#parameters
    }

    throw new RuntimeError('Event is not bound')
  }

  /**
   * Get specific route parameter.
   *
   * @param  {string} name
   * @param  {*} [fallback=null] return default value when not found.
   * @return {*}
   * @throws {RuntimeError}
   */
  parameter (name, fallback = null) {
    return this.parameters()[name] ?? fallback
  }

  /**
   * Set specific route parameter.
   *
   * @param  {string} name
   * @param  {*} value
   * @return {this}
   * @throws {RuntimeError}
   */
  setParameter (name, value) {
    this.parameters()[name] = value
    return this
  }

  /**
   * Delete specific route parameter.
   *
   * @param  {string} name
   * @return {this}
   * @throws {RuntimeError}
   */
  deleteParameter (name) {
    delete this.parameters()[name]
    return this
  }

  /**
   * Get all non null route parameters.
   *
   * @return {Object}
   * @throws {RuntimeError}
   */
  parametersWithoutNulls () {
    return Object.fromEntries(Object.entries(this.parameters()).filter(([, value]) => value != null))
  }

  /**
   * Get all parameter names.
   *
   * @return {string[]}
   * @throws {RuntimeError}
   */
  parameterNames () {
    this.#parameterNames ??= Object.keys(this.parameters())
    return this.#parameterNames
  }

  /**
   * Get all optional parameter names.
   *
   * @return {string[]}
   */
  optionalParameterNames () {
    const constraints = this._uriConstraints()
    return this
      .parameterNames()
      .filter(param => constraints.find(v => v.param === param)?.optional)
  }

  /**
   * Is parameter name optional.
   *
   * @param  {string} name
   * @return {boolean}
   */
  isParameterNameOptional (name) {
    return this.optionalParameterNames().includes(name)
  }

  /**
   * Set Uri regex pattern to be strict when matching.
   *
   * @param  {boolean} value
   * @return {this}
   */
  setStrict (value) {
    this.#definition.set('strict', value)
    return this
  }

  /**
   * Add single binding value.
   *
   * @param  {string} name
   * @param  {Function} value
   * @return {this}
   */
  addBinding (name, value) {
    this.#definition.add('bindings', { [name]: value }, false)
    return this
  }

  /**
   * Add binding values.
   *
   * @param  {Object} bindings
   * @return {this}
   */
  addBindings (bindings) {
    Object.entries(bindings).forEach(([name, value]) => this.addBinding(name, value))
    return this
  }

  /**
   * Get binding value by name.
   *
   * @param  {string} name
   * @return {Function}
   */
  getBinding (name) {
    return this.#definition.get('bindings', {})[name] ?? null
  }

  /**
   * Add single default value.
   *
   * @param  {string} name
   * @param  {*} value
   * @return {this}
   */
  addDefault (name, value) {
    this.#definition.add('defaults', { [name]: value }, false)
    return this
  }

  /**
   * Add default values.
   *
   * @param  {Object} defaults
   * @return {this}
   */
  addDefaults (defaults) {
    Object.entries(defaults).forEach(([name, value]) => this.addDefault(name, value))
    return this
  }

  /**
   * Get default value by name.
   *
   * @param  {string} name
   * @return {*}
   */
  getDefault (name) {
    return this.#definition.get('defaults', {})[name] ?? null
  }

  /**
   * Add single rule value.
   *
   * @param  {string} name
   * @param  {*} value
   * @return {this}
   */
  addRule (name, value) {
    this.#definition.add('rules', { [name]: value }, false)
    return this
  }

  /**
   * Add rule values.
   *
   * @param  {Object} rules
   * @return {this}
   */
  addRules (rules) {
    Object.entries(rules).forEach(([name, rule]) => this.addRule(name, rule))
    return this
  }

  /**
   * Get rule value by name.
   *
   * @param  {string} name
   * @param  {string|RegExp} [fallback=[^/]+?] return default value when not found.
   * @return {string|RegExp}
   */
  getRule (name, fallback = '[^/]+?') {
    return this.#definition.get('rules', {})[name] ?? fallback
  }

  /**
   * Is domain defined.
   *
   * @return {boolean}
   */
  hasDomain () {
    return !!this.domain
  }

  /**
   * Is secure.
   *
   * @return {boolean}
   */
  isSecure () {
    return this.isHttpsOnly()
  }

  /**
   * Is http only.
   *
   * @return {boolean}
   */
  isHttpOnly () {
    return this.protocol === 'http'
  }

  /**
   * Is https.
   *
   * @return {boolean}
   */
  isHttpsOnly () {
    return this.protocol === 'https'
  }

  /**
   * Get action type.
   *
   * @return {('Component'|'Closure'|'Controller')}
   */
  getActionType () {
    return isBrowser() ? 'Component' : (isFunction(this.action) ? 'Closure' : 'Controller')
  }

  /**
   * Get component action.
   *
   * @return {Object}
   * @throws {RuntimeError}
   */
  getComponent () {
    if (isBrowser()) {
      return this.action
    }

    throw new RuntimeError('Component action must be called only on browser context.')
  }

  /**
   * Is callable action.
   *
   * @return {boolean}
   */
  isCallableAction () {
    return isFunction(this.action)
  }

  /**
   * Get callable action.
   *
   * @return {Function}
   * @throws {TypeError}
   */
  getCallable () {
    if (this.isCallableAction()) {
      return this.action
    }

    throw new TypeError('Callable action must be a function')
  }

  /**
   * Is controller action.
   *
   * @return {boolean}
   */
  isControllerAction () {
    return isPlainObject(this.action) && isConstructor(Object.values(this.action).pop())
  }

  /**
   * Get controller action.
   *
   * @return {Object}
   * @throws {TypeError}
   */
  getController () {
    if (!this._controller) {
      if (this.isControllerAction()) {
        this._controller = this.#resolveService(Object.values(this.action)[0])
      } else {
        throw new TypeError('The controller must be a class')
      }
    }

    return this._controller
  }

  /**
   * Get controller method.
   *
   * @return {string}
   * @throws {TypeError}
   */
  getControllerMethod () {
    if (this.isControllerAction()) {
      return Object.keys(this.action)[0]
    } else {
      throw new TypeError("The controller action must be a string, representing the controller's method.")
    }
  }

  /**
   * Get controller fullname.
   *
   * @return {string}
   */
  getControllerActionFullname (separator = '@') {
    const [action, Class] = Object.entries(this.action).pop()
    return [Class.name, action].join(separator)
  }

  /**
   * Generate a route string.
   *
   * @param  {Object} [params={}]
   * @param  {boolean} [withDomain=true]
   * @param  {string} [protocol=null]
   * @return {string}
   */
  generate (params = {}, withDomain = true, protocol = null) {
    const pathCons = this._getSegmentsConstraints(this.path)

    let query = Object.entries(params).filter(([name]) => !pathCons.find(v => name === v.param))
    let path = pathCons.reduce((prev, curr) => `${prev}${curr.prefix ?? ''}${curr.param ? (params[curr.param] ?? curr.default) : curr.match}/`, '/')

    if (withDomain) {
      const domainCons = this._getDomainConstraints()
      if (domainCons?.suffix) {
        protocol ??= this.protocol ?? 'http'
        query = query.filter(([name]) => name !== domainCons.param)
        path = `${protocol}://${params[domainCons.param] ?? domainCons.default ?? ''}${domainCons.suffix}${path}`
      }
    }

    if (query.length) {
      const queryString = new URLSearchParams(query).toString()
      path = `${path}?${queryString}`
    }

    return path
  }

  /**
   * Get router.
   *
   * @returns {Router}
   */
  getRouter () {
    return this.#router
  }

  /**
   * Set router.
   *
   * @param   {Router} router
   * @returns {this}
   */
  setRouter (router) {
    this.#router = router

    return this
  }

  /**
   * Set container.
   *
   * @param   {external:Container} container
   * @returns {this}
   */
  setContainer (container) {
    this.#container = container

    return this
  }

  /**
   * Has matchers.
   *
   * @return {boolean}
   */
  hasMatchers () {
    return this.#matchers?.length > 0
  }

  /**
   * Get matchers.
   *
   * @return {Object}
   */
  getMatchers () {
    return this.#matchers
  }

  /**
   * Set matchers.
   *
   * @param {Object} matchers
   * @return {this}
   */
  setMatchers (matchers) {
    this.#matchers = matchers
    return this
  }

  /**
   * Get dispatchers.
   *
   * @return {Object}
   */
  getDispatchers () {
    return this.#dispatchers
  }

  /**
   * Get dispatcher.
   *
   * @param  {string} type
   * @return {Function}
   */
  getDispatcher (type) {
    return this.getDispatchers()[type]
  }

  /**
   * Has dispatcher.
   *
   * @param  {string} type
   * @return {boolean}
   */
  hasDispatcher (type) {
    return !!this.getDispatcher(type)
  }

  /**
   * Set dispatchers.
   *
   * @param  {Object} dispatchers
   * @return {this}
   */
  setDispatchers (dispatchers) {
    Object
      .entries(dispatchers)
      .forEach(([type, dispatcher]) => this.addDispatcher(type, dispatcher))
    return this
  }

  /**
   * Add dispatchers.
   *
   * @param  {string} type
   * @param  {Object} dispatcher
   * @return {this}
   * @throws {TypeError}
   */
  addDispatcher (type, dispatcher) {
    if (!['component', 'callable', 'controller'].includes(type)) {
      throw new TypeError(`Invalid dispatcher type ${type}. Valid types are 'component', 'callable' and 'controller'`)
    }
    this.#dispatchers[type] = dispatcher
    return this
  }

  /**
   * Get uri regex.
   * This regex is generated from route definition and used to match against event path.
   *
   * @param  {string} [flag='i']
   * @return {RegExp[]}
   */
  uriRegex (flags = 'i') {
    flags = this.isStrict ? '' : flags
    const trailingSlash = this.isStrict ? (this.path.endsWith('/') ? '/' : '') : '/?'
    const domain = this.domain ? this._buildDomainPattern(this._getDomainConstraints()) : ''

    return [this.path].concat(this.alias).map(path => {
      const pattern = this._getSegmentsConstraints(path).reduce((prev, curr) => `${prev}${this._buildSegmentPattern(curr)}`, '')
      return new RegExp(`^${domain}${pattern.length ? pattern : '/'}${trailingSlash}$`, flags)
    })
  }

  /**
   * Get path regex including alias.
   * This regex is generated from route definition and used to match against event path.
   *
   * @param  {string} [flag=null]
   * @return {RegExp[]}
   */
  pathRegex (flags = 'i') {
    flags = this.isStrict ? '' : flags
    const trailingSlash = this.isStrict ? (this.path.endsWith('/') ? '/' : '') : '/?'

    return [this.path].concat(this.alias).map(path => {
      const pattern = this._getSegmentsConstraints(path).reduce((prev, curr) => `${prev}${this._buildSegmentPattern(curr)}`, '')
      return new RegExp(`^${pattern.length ? pattern : '/'}${trailingSlash}$`, flags)
    })
  }

  /**
   * Get domain regex.
   * This regex is generated from route definition and used to match against event path.
   *
   * @param  {string} [flag=null]
   * @return {RegExp}
   */
  domainRegex (flags = 'i') {
    flags = this.isStrict ? '' : flags
    const pattern = this.domain ? this._buildDomainPattern(this._getDomainConstraints()) : null
    return pattern ? new RegExp(`^${pattern}$`, flags) : null
  }

  /** @private */
  _buildDomainPattern (value) {
    if (!value?.param) { return value?.suffix }
    return value.optional
      ? `(${value.rule})?${value.suffix}`
      : `(${value.rule})${value.suffix}`
  }

  /** @private */
  _buildSegmentPattern (value = null) {
    if (!value) {
      return '/'
    }

    if (!value.param) {
      return `/${value.match}`
    }

    if (value.prefix) {
      switch (value.quantifier) {
        case '?':
          return `/${value.prefix}(${value.rule})?`
        case '+':
          return `/${value.prefix}((?:${value.rule})(?:/(?:${value.rule}))*)`
        case '*':
          return `/${value.prefix}((?:${value.rule})(?:/(?:${value.rule}))*)?`
        default:
          return `/${value.prefix}(${value.rule})`
      }
    }

    switch (value.quantifier) {
      case '?':
        return `(?:/(${value.rule}))?`
      case '+':
        return `/((?:${value.rule})(?:/(?:${value.rule}))*)`
      case '*':
        return `(?:/((?:${value.rule})(?:/(?:${value.rule}))*))?`
      default:
        return `/(${value.rule})`
    }
  }

  /**
   * Internal SegmentConstraint object.
   *
   * @typedef  {Object}  SegmentConstraint
   * @property {string}  match - Segment value.
   * @property {string}  prefix - Segment prefix value.
   * @property {string}  suffix - Domain suffix value.
   * @property {string}  param - Param name.
   * @property {string}  alias - Value defined as alias for entity bindings.
   * @property {string}  rule - Regex rule.
   * @property {string}  quantifier - Regex quantifier.
   * @property {string}  default - Default value for param.
   * @property {boolean} optional - Is param optional.
   */

  /**
   * Get uri constraints.
   *
   * @private
   * @return {SegmentConstraint[]}
   */
  _uriConstraints () {
    return [].concat(this._getDomainConstraints(), this._getSegmentsConstraints(this.path)).filter(v => !!v)
  }

  /**
   * Get domain constraints.
   *
   * @private
   * @return {SegmentConstraint}
   */
  _getDomainConstraints () {
    const keys = ['match', 'param', 'alias', 'rule', 'quantifier', 'default', 'suffix']
    this.#domainConstraints ??= this
      .domain
      ?.match(Route.domainConstraintRegex)
      ?.filter((_, i) => i < keys.length)
      ?.reduce((prev, curr, i) => ({ ...prev, [keys[i]]: curr }), {})

    if (this.#domainConstraints?.param) {
      this.#domainConstraints.rule ??= this.getRule(this.#domainConstraints.param)
      this.#domainConstraints.default ??= this.getDefault(this.#domainConstraints.param)
      this.#domainConstraints.optional = /^[?*]$/.test(this.#domainConstraints.quantifier)
    }

    return this.#domainConstraints
  }

  /**
   * Get path segments constraints.
   *
   * @private
   * @return {SegmentConstraint[]}
   */
  _getSegmentsConstraints (path) {
    this.#segmentConstraints ??= path
      .split('/')
      .filter(segment => segment.trim().length)
      .map(segment => {
        if (/[:}]/.test(segment)) {
          const keys = ['match', 'prefix', 'param', 'alias', 'rule', 'quantifier', 'default']
          return segment
            .match(Route.pathConstraintRegex)
            ?.filter((_, i) => i < keys.length)
            ?.reduce((prev, curr, i) => ({ ...prev, [keys[i]]: curr }), {})
        }
        return { match: segment }
      })
      .map(segment => {
        if (segment.param) {
          segment.rule ??= this.getRule(segment.param)
          segment.default ??= this.getDefault(segment.param)
          segment.optional = /^[?*]$/.test(segment.quantifier)
        }
        return segment
      })
    return this.#segmentConstraints
  }

  async #bindParameters (event) {
    if (!event.getUri) {
      throw new TypeError('Event must have a `getUri` method.')
    }

    const params = {}
    const constraints = this._uriConstraints().filter(v => v.param)

    const matches = this
      .uriRegex()
      .reduce((prev, curr) => prev.length ? prev : (event.getUri(this.hasDomain()).match(curr) ?? []), [])
      .filter((_v, i) => i > 0)
      .map(v => isNumeric(v) ? parseFloat(v) : v)

    for (const i in constraints) {
      const v = constraints[i]
      let value = matches[i]
      if (this.#hasModelBinding(v.param)) {
        value = await this.#bindModel(v.param, value, v.alias, v.optional)
      }
      params[v.param] = value ?? v.default
    }

    return Object
      .entries(this.defaults)
      .reduce((prev, [name, value]) => prev[name] ? prev : { ...prev, [name]: value }, params)
  }

  #hasModelBinding (field) {
    return !!this.getBinding(field)
  }

  async #bindModel (field, value, alias, isOptional) {
    let model = null
    const key = alias ?? field
    const Class = this.getBinding(field)

    if (isConstructor(Class)) {
      if (Class.resolveRouteBinding) {
        try {
          model = await Class.resolveRouteBinding(key, value)
        } catch (error) {
          throw new HttpError(404, 'Not found!', [], `No model found for this value "${value}".`, null, null, null, error)
        }
      } else if (Class.prototype.resolveRouteBinding) {
        try {
          model = await this.#resolveService(Class).resolveRouteBinding(key, value)
        } catch (error) {
          throw new HttpError(404, 'Not found!', [], `No model found for this value "${value}".`, null, null, null, error)
        }
      } else {
        throw new TypeError('Binding must have this `resolveRouteBinding` as class or instance method.')
      }

      if (!model && !isOptional) {
        throw new HttpError(404, 'Not found!', [], `No model found for this value "${value}".`)
      }

      return model
    } else {
      throw new TypeError('Binding must be a class.')
    }
  }

  async #runRedirection (event, redirect, status = 302) {
    if (isPlainObject(redirect)) {
      const [[status, location]] = Object.entries(redirect)
      return this.#runRedirection(event, location, parseInt(status))
    } else if (isFunction(redirect)) {
      return this.#runRedirection(event, await redirect(this, event))
    } else {
      return { status, statusCode: status, headers: { Location: redirect } }
    }
  }

  #runComponent (event) {
    return this.#componentDispatcher().dispatch(event, this, this.getComponent())
  }

  #componentDispatcher () {
    if (this.hasDispatcher('component')) {
      return this.#resolveService(this.getDispatcher('component'))
    }

    throw new TypeError('No component dispatcher provided.')
  }

  #runCallable (event) {
    return this.#callableDispatcher().dispatch(event, this, this.getCallable())
  }

  #callableDispatcher () {
    if (this.hasDispatcher('callable')) {
      return this.#resolveService(this.getDispatcher('callable'))
    }

    throw new TypeError('No callable dispatcher provided')
  }

  #runController (event) {
    return this.#controllerDispatcher().dispatch(event, this, this.getController(), this.getControllerMethod())
  }

  #controllerDispatcher () {
    if (this.hasDispatcher('controller')) {
      return this.#resolveService(this.getDispatcher('controller'))
    }

    throw new TypeError('No controller dispatcher provided')
  }

  #resolveService (Class) {
    return this.#container?.resolve(Class) ?? new Class()
  }

  /**
   * Get route as literal object.
   *
   * @return {Object}
   */
  toJSON () {
    return {
      name: this.name ?? 'Empty',
      path: this.path,
      methods: this.methods,
      action: this.isControllerAction() ? this.getControllerActionFullname() : this.getActionType(),
      domain: this.domain ?? 'Empty',
      fallback: this.isFallback
    }
  }

  /**
   * Get route as string.
   *
   * @return {string}
   */
  toString () {
    return JSON.stringify(this.toJSON())
  }
}
