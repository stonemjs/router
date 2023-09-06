/**
 * Holds information about the current request.
 *
 * @author Mr. Stone <pierre.evens16@gmail.com>
 */
export class RequestContext {
  #routeResolver

  constructor({
    ip,
    host,
    body,
    path,
    query,
    route,
    params,
    method,
    locale,
    headers,
    baseUrl,
    hostname,
    protocol,
    httpPort,
    httpsPort,
    queryString
  }) {
    this.ip = ip
    this.host = host
    this.body = body
    this.path = path
    this.query = query
    this.route = route
    this.params = params
    this.method = method
    this.locale = locale
    this.pathInfo = path
    this.headers = headers
    this.baseUrl = baseUrl
    this.hostname = hostname
    this.protocol = protocol
    this.httpPort = httpPort
    this.httpsPort = httpsPort
    this.queryString = queryString
  }

  /**
   * Creates the RequestContext information based on a HttpFoundation Request.
   *
   * @param {string}  uri
   * @param {string = 'localhost'}  hostname
   * @param {string = 'http'}  protocol
   * @param {number = 80}  httpPort
   * @param {number = 443}  httpsPort
   * 
   * @return ${this}
   */
  static fromUri (uri, hostname = 'localhost', protocol = 'http', httpPort = 80, httpsPort = 443) {
    const url = new URL(uri)

    return new this({
      method: 'GET',
      host: url.host,
      path: url.pathname,
      baseUrl: url.origin,
      queryString: url.search,
      hostname: url.hostname ?? hostname,
      query: this.#parseQuery(url.searchParams),
      protocol: url.protocol.replace(':', '') ?? protocol,
      httpPort: (url.protocol === 'http' && url.port) ?? httpPort,
      httpsPort: (url.protocol === 'https' && url.port) ?? httpsPort,
    })
  }

  /**
   * Creates the RequestContext information based on a HttpFoundation Request.
   *
   * @param {Request} request
   * 
   * @return {this}
   */
  static fromRequest(request) {
    return new this({ ...request })
  }

  static #parseQuery (searchParams) {
    return Array
      .from(searchParams)
      .reduce((prev, [key, value]) => {
        prev[key] = prev[key] ? (Array.isArray(prev[key]) ? [...prev[key], value] : [prev[key], value]) : value
        return prev
      }, {})
  }

  isMethod (name) {
    return this.method.toUpperCase() === name.toUpperCase()
  }
  
  /**
   * Is Secure
   *
   * @return {boolean}
   */
  get isSecure () {
    return 'https' === this.protocol
  }

  get decodedPath () {
    return decodeURI(this.path)
  }

  route (param = null, fallback = null) {
    const route = this.getRouteResolver()()

    if (!route || !param) {
      return route
    }

    return route.parameter(param, fallback)
  }

  getRouteResolver () {
    return this.#routeResolver ?? (() => {})
  }

  setRouteResolver (resolver) {
    this.#routeResolver = resolver

    return this
  }
}