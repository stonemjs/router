export class RouteParameterBinder {
  #route

  constructor ({ route }) {
    this.#route = route
  }

  static getParameters (route, request) {
    return new this({ route }).parameters(request)
  }

  parameters (request) {
    return this.#replaceDefaults(this.#bindParameters(request))
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
