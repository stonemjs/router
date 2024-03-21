import { RouteDefinition } from './RouteDefinition.mjs'
import { MethodMatcher } from './matchers/MethodMatcher.mjs'
import { LogicException, isPlainObject, isFunction, isClass, isNumeric } from '@stone-js/common'

export class Route {
  #router
  #matchers
  #container
  #parameters
  #definition
  #dispatchers

  #parameterNames
  #domainConstraints
  #segmentConstraints

  static pathConstraintRegex = /^(.+?)?[:{](.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\}?$/
  static domainConstraintRegex = /^(?:\{(.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\})?(.+)$/

  static create (routeDefinition) {
    return new this(routeDefinition)
  }

  constructor (routeDefinition) {
    if (!(routeDefinition instanceof RouteDefinition)) {
      throw new LogicException("This method's parameter must be an instance of `RouteDefinition`")
    }

    this.#matchers = []
    this.#dispatchers = {}
    this.#definition = routeDefinition
  }

  get uri () {
    return `${this.domain ?? ''}${this.path}`
  }

  get path () {
    return `/${this.get('path', '').trim()}`.replaceAll(/\/+/g, '/')
  }

  get domain () {
    return this.get('domain')?.replace(/^https?:\/\//, '') ?? null
  }

  get methods () {
    return this.#definition.getMethods()
  }

  get action () {
    return this.get('action')
  }

  get name () {
    return this.get('name')
  }

  get rules () {
    return this.get('rules', {})
  }

  get defaults () {
    return this.get('defaults', {})
  }

  get protocol () {
    return this.get('protocol')
  }

  get isFallback () {
    return this.get('fallback', false)
  }

  get middleware () {
    return this.get('middleware', [])
  }

  get excludeMiddleware () {
    return this.get('excludeMiddleware', [])
  }

  get (key, fallback = null) {
    return this.#definition.get(key, fallback)
  }

  matches (request, includingMethod = true) {
    const matchers = this.getMatchers().filter(matcher => !(!includingMethod && matcher instanceof MethodMatcher))
    for (const matcher of matchers) {
      if (!matcher.matches(this, request)) {
        return false
      }
    }
    return true
  }

  async bind (request) {
    this.#parameters = await this.#bindParameters(request)
    return this
  }

  run (request) {
    if (this._isBrowser()) {
      return this.#runComponent(request)
    } else if (this.isControllerAction()) {
      return this.#runController(request)
    } else if (this.isCallableAction()) {
      return this.#runCallable(request)
    } else {
      throw new LogicException('Invalid action provided.')
    }
  }

  hasParameters () {
    return !!this.#parameters
  }

  hasParameter (name) {
    return this.hasParameters() && !!this.#parameters[name]
  }

  parameters () {
    if (this.hasParameters()) {
      return this.#parameters
    }

    throw new LogicException('Route is not bound')
  }

  parameter (name, fallback = null) {
    return this.parameters()[name] ?? fallback
  }

  setParameter (name, value) {
    this.parameters()[name] = value
    return this
  }

  deleteParameter (name) {
    delete this.parameters()[name]
    return this
  }

  parametersWithoutNulls () {
    return Object.fromEntries(Object.entries(this.parameters()).filter(([, value]) => value != null))
  }

  parameterNames () {
    this.#parameterNames ??= Object.keys(this.parameters())
    return this.#parameterNames
  }

  optionalParameterNames () {
    const constraints = this._uriConstraints()
    return this
      .parameterNames()
      .filter(param => constraints.find(v => v.param === param)?.optional)
  }

  isParameterNameOptional (name) {
    return this.optionalParameterNames().includes(name)
  }

  addDefault (name, value) {
    this.#definition.add('defaults', { [name]: value }, false)
    return this
  }

  addDefaults (defaults) {
    Object.entries(defaults).forEach(([name, value]) => this.addDefault(name, value))
    return this
  }

  getDefault (name) {
    return this.#definition.get('defaults', {})[name] ?? null
  }

  addRule (name, value) {
    this.#definition.add('rules', { [name]: value }, false)
    return this
  }

  addRules (rules) {
    Object.entries(rules).forEach(([name, rule]) => this.addRule(name, rule))
    return this
  }

  getRule (name, fallback = '[^/]+?') {
    return this.#definition.get('rules', {})[name] ?? fallback
  }

  hasDomain () {
    return !!this.domain
  }

  isSecure () {
    return this.isHttpsOnly()
  }

  isHttpOnly () {
    return this.protocol === 'http'
  }

  isHttpsOnly () {
    return this.protocol === 'https'
  }

  getActionType () {
    return this._isBrowser() ? 'Component' : (isFunction(this.action) ? 'Closure' : 'Controller')
  }

  getComponent () {
    if (this._isBrowser()) {
      return this.action
    }

    throw new LogicException('Component action must be called only on browser context.')
  }

  isCallableAction () {
    return isFunction(this.action)
  }

  getCallable () {
    if (this.isCallableAction()) {
      return this.action
    }

    throw new LogicException('Callable action must be a function')
  }

  isControllerAction () {
    return isPlainObject(this.action) && isClass(Object.values(this.action).pop())
  }

  getController () {
    if (!this._controller) {
      if (this.isControllerAction()) {
        this._controller = this.#getInstance(Object.values(this.action)[0])
      } else {
        throw new LogicException('The controller must be a class')
      }
    }

    return this._controller
  }

  getControllerMethod () {
    if (this.isControllerAction()) {
      return Object.keys(this.action)[0]
    } else {
      throw new LogicException("The controller action must be a string, representing the controller's method.")
    }
  }

  getControllerActionFullname (separator = '@') {
    const [action, Class] = Object.entries(this.action).pop()
    return [Class.metadata?.name ?? Class.name, action].join(separator)
  }

  generate (params = {}, query = {}, hash = null, withDomain = true) {
    let path = this
      ._getSegmentsConstraints()
      .reduce((prev, curr) => `${prev}${curr.prefix ?? ''}${curr.param ? (params[curr.param] ?? curr.default) : curr.match}/`, '/')

    if (withDomain) {
      const domainCons = this._getDomainConstraints()
      if (domainCons?.suffix) {
        path = `${params[domainCons.param] ?? domainCons.default ?? ''}${domainCons.suffix}${path}`
      }
    }

    if (Object.keys(query).length) {
      const queryString = new URLSearchParams(query).toString()
      path = `${path}?${queryString}`
    }

    if (hash) {
      path = `${path}#${hash}`
    }

    return path
  }

  getRouter () {
    return this.#router
  }

  setRouter (router) {
    this.#router = router

    return this
  }

  setContainer (container) {
    this.#container = container

    return this
  }

  hasMatchers () {
    return this.#matchers?.length > 0
  }

  getMatchers () {
    return this.#matchers
  }

  setMatchers (matchers) {
    this.#matchers = matchers
    return this
  }

  getDispatchers () {
    return this.#dispatchers
  }

  getDispatcher (type) {
    return this.getDispatchers()[type]
  }

  hasDispatcher (type) {
    return !!this.getDispatcher(type)
  }

  setDispatchers (dispatchers) {
    Object
      .entries(dispatchers)
      .forEach(([type, dispatcher]) => this.addDispatcher(type, dispatcher))
    return this
  }

  addDispatcher (type, dispatcher) {
    if (!['component', 'callable', 'controller'].includes(type)) {
      throw new LogicException(`Invalid dispatcher type ${type}. Valid types are 'component', 'callable' and 'controller'`)
    }
    this.#dispatchers[type] = dispatcher
    return this
  }

  uriRegex (flag = 'i') {
    const domain = this.domain ? this._buildDomainPattern(this._getDomainConstraints()) : ''
    const path = this._getSegmentsConstraints().reduce((prev, curr) => `${prev}${this._buildSegmentPattern(curr)}`, '')
    return new RegExp(`^${domain}${path.length ? path : '/'}/?$`, flag)
  }

  pathRegex (flag = 'i') {
    const pattern = this._getSegmentsConstraints().reduce((prev, curr) => `${prev}${this._buildSegmentPattern(curr)}`, '')
    return new RegExp(`^${pattern.length ? pattern : '/'}/?$`, flag)
  }

  domainRegex (flag = 'i') {
    const pattern = this.domain ? this._buildDomainPattern(this._getDomainConstraints()) : null
    return pattern ? new RegExp(`^${pattern}$`, flag) : null
  }

  _buildDomainPattern (value) {
    if (!value?.param) { return value?.suffix }
    return value.optional
      ? `(${value.rule})?${value.suffix}`
      : `(${value.rule})${value.suffix}`
  }

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
   * SegmentConstraint
   *
   * @typedef  {Object}  SegmentConstraint
   * @property {string}  match - The domain real value.
   * @property {string}  prefix - The segment prefix value.
   * @property {string}  suffix - The domain suffix value.
   * @property {string}  param - The domain param name.
   * @property {string}  alias - The value defined as alias for entity bindings.
   * @property {string}  rule - The domain regex rule.
   * @property {string}  quantifier - The domain regex quantifier.
   * @property {string}  default - The default value when there is no values.
   * @property {boolean} optional - Is this domain is optional.
   */

  /**
   * Get uri constraints.
   *
   * @return {SegmentConstraint[]}
   */
  _uriConstraints () {
    return [].concat(this._getDomainConstraints(), this._getSegmentsConstraints()).filter(v => !!v)
  }

  /**
   * Get domain constraints.
   *
   * @return {SegmentConstraint}
   */
  _getDomainConstraints () {
    const keys = ['match', 'param', 'alias', 'rule', 'quantifier', 'suffix']
    this.#domainConstraints ??= this
      .domain
      ?.match(Route.domainConstraintRegex)
      ?.filter((_, i) => i < 6)
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
   * @return {SegmentConstraint[]}
   */
  _getSegmentsConstraints () {
    this.#segmentConstraints ??= this
      .path
      .split('/')
      .filter(segment => segment.trim().length)
      .map(segment => {
        if (/[:}]/.test(segment)) {
          const keys = ['match', 'prefix', 'param', 'alias', 'rule', 'quantifier']
          return segment
            .match(Route.pathConstraintRegex)
            ?.filter((_, i) => i < 6)
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

  async #bindParameters (request) {
    if (!Object.hasOwn(request, 'getUri')) {
      throw new LogicException('Request must have a `getUri` method.')
    }

    const params = {}
    const constraints = this._uriConstraints().filter(v => v.param)
    const matches = request
      .getUri(this.hasDomain())
      .match(this.uriRegex())
      ?.filter((_v, i) => i > 0)
      ?.map(v => isNumeric(v) ? parseFloat(v) : v) ?? []

    for (const i in constraints) {
      const v = constraints[i]
      let value = matches[i]
      if (this.#hasEntityBinding(v.param)) {
        value = await this.#bindEntity(v.param, value, v.alias, v.optional)
      }
      params[v.param] = value ?? v.default
    }

    return Object
      .entries(this.defaults)
      .reduce((prev, [name, value]) => prev[name] ? prev : { ...prev, [name]: value }, params)
  }

  _isBrowser () {
    return typeof window === 'object'
  }

  #hasEntityBinding (field) {
    return !!this.get('bindings', {})[field]
  }

  #bindEntity (field, value, alias, isOptional) {
    const key = alias ?? field
    const Class = this.get('bindings', {})[field]

    if (isClass(Class)) {
      if (Class.resolveRouteBinding) {
        return Class.resolveRouteBinding(key, value, isOptional)
      } else if (Class.prototype.resolveRouteBinding) {
        const instance = this.#getInstance(Class)
        return instance.resolveRouteBinding(key, value, isOptional)
      } else {
        throw new LogicException('Binding must have this `resolveRouteBinding` as class or instance method.')
      }
    } else {
      throw new LogicException('Binding must be a class.')
    }
  }

  #runComponent (request) {
    return this.#componentDispatcher().dispatch(request, this, this.getComponent())
  }

  #componentDispatcher () {
    if (this.hasDispatcher('component')) {
      return this.#getInstance(this.getDispatcher('component'))
    }

    throw new LogicException('No component dispatcher provided.')
  }

  #runCallable (request) {
    return this.#callableDispatcher().dispatch(request, this, this.getCallable())
  }

  #callableDispatcher () {
    if (this.hasDispatcher('callable')) {
      return this.#getInstance(this.getDispatcher('callable'))
    }

    throw new LogicException('No callable dispatcher provided')
  }

  #runController (request) {
    return this.#controllerDispatcher().dispatch(request, this, this.getController(), this.getControllerMethod())
  }

  #controllerDispatcher () {
    if (this.hasDispatcher('controller')) {
      return this.#getInstance(this.getDispatcher('controller'))
    }

    throw new LogicException('No controller dispatcher provided')
  }

  #getInstance (Class) {
    return this.#container ? this.#container.make(Class) : new Class()
  }

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

  toString () {
    return JSON.stringify(this.toJSON())
  }
}
