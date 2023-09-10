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
    const regex = this.#route.domainAndUriRegex()
    const requestUri = requestContext.getUri(this.#route.hasDomain())
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
