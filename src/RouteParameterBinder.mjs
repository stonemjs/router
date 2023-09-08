export class RouteParameterBinder {
  constructor ({ route }) {
    this._route = route
  }

  static getParameters (route, requestContext) {
    return new this({ route }).parameters(requestContext)
  }

  parameters (requestContext) {
    return this._replaceDefaults(this._bindParameters(requestContext))
  }

  _bindParameters (requestContext) {
    let matchers
    const values = []
    const regex = this._route.domainAndUriRegex()
    const value = `${requestContext.hostname}${requestContext.decodedPath}`

    while ((matchers = regex.exec(value)) !== null) {
      if (matchers.index === regex.lastIndex) { regex.lastIndex++ } // This is necessary to avoid infinite loops with zero-width matches
      matchers[0] && values.push(matchers[0].replace(/\//gm, ''))
    }

    return this._matchToKeys(values)
  }

  _matchToKeys (matches) {
    const names = this._route.parameterNames()
    if (names && names.length === 0) return {}
    return names.map((name, i) => [name, matches[i]])
  }

  _replaceDefaults (entries) {
    const params = Object.fromEntries(entries.map(([name, value]) => [name, value ?? this._route.getDefault(name)]))

    for (const [name, value] of Object.entries(this._route.defaults)) {
      if (!params[name]) params[name] = value
    }

    return params
  }
}
