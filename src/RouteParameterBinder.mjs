export class RouteParameterBinder {
  #route

  #pathConstraintRegex = /^(.+?)?[:{](.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\}?$/
  #domainConstraintRegex = /^(?:\{(.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)\})?(.+)$/

  constructor ({ route }) {
    this.#route = route
  }

  static getParameters (route, request) {
    return new this({ route }).parameters(request)
  }

  parameters (request) {
    return this.#replaceDefaults(this.#bindParameters(request))
  }

  uriConstraints () {
    return [].concat(this.domainConstraints(), this.pathConstraints())
  }

  domainConstraints () {
    const keys = ['match', 'param', 'alias', 'rule', 'quantifier', 'suffix']
    const domain = this
      .#route
      .getDomain()
      ?.match(this.#domainConstraintRegex)
      ?.filter((_, i) => i < 6)
      ?.reduce((prev, curr) => ({ ...prev, [keys[i]]: curr }), {})
    
    if (domain.param) {
      domain.rule ??= this.#route.getRule(domain.param)
      domain.optional = /^[?*]$/.test(domain.quantifier)
      domain.default ??= this.#route.getDefault(domain.param)
    }

    return domain
  }

  pathConstraints () {
    return this
      .#route
      .path
      .split('/')
      .filter(segment => segment.trim().length)
      .map(segment => {
        if (segment.includes(':')) {
          const keys = ['match', 'prefix', 'param', 'alias', 'rule', 'quantifier']
          return segment
            .match(this.#pathConstraintRegex)
            .filter((_, i) => i < 6)
            .reduce((prev, curr) => ({ ...prev, [keys[i]]: curr }), {})
        }
        return { match: segment }
      })
      .map(segment => {
        if (segment.param) {
          segment.rule ??= this.#route.getRule(segment.param)
          segment.optional = /^[?*]$/.test(segment.quantifier)
          segment.default ??= this.#route.getDefault(segment.param)
        }
        return segment
      })
  }

  #bindParameters (request) {
    const regex = this.#route.domainAndUriRegex()
    const requestUri = request.getUri(this.#route.hasDomain())
    let matches = [...requestUri.matchAll(regex)]

    matches = matches.reduce((prev, match) => prev.concat(match.filter((_v, i) => i > 0)), [])

    return this.#matchToKeys(this.#parseMatches(matches))
  }

  #matchToKeys (matches) {
    return this.#route.parameterNames()?.map((name, i) => [name, matches[i]])
  }

  #replaceDefaults (entries) {
    const params = Object.fromEntries(entries.map(([name, value]) => [name, value ?? this.#route.getDefault(name)]))

    for (const [name, value] of Object.entries(this.#route.defaults ?? {})) {
      if (!params[name]) params[name] = value
    }

    return params
  }

  #parseMatches (matches) {
    return matches.map(v => this.#isNumeric(v) ? parseFloat(v) : v)
  }

  #isNumeric (value) {
    return !isNaN(parseFloat(value)) && isFinite(value)
  }
}
