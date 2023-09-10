export class RouteParameterBinder {
  #route

  constructor ({ route }) {
    this.#route = route
  }

  static getParameters (route, requestContext) {
    return new this({ route }).parameters(requestContext)
  }

  parameters (requestContext) {
    return this.#replaceDefaults(this.#bindParameters(requestContext))
  }

  #bindParameters (requestContext) {
    let matchers
    const values = []
    const regex = this.#route.domainAndUriRegex()
    const value = `${this.#route.hasDomain() ? requestContext.hostname : ''}${requestContext.decodedPath}`

    while ((matchers = regex.exec(value)) !== null) {
      if (matchers.index === regex.lastIndex) { regex.lastIndex++ } // This is necessary to avoid infinite loops with zero-width matches
      (matchers[1] || matchers[0]) && values.push((matchers[1] ?? matchers[0]).replace(/\//gm, ''))
    }

    return this.#matchToKeys(this.#parseMatches(values))
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
