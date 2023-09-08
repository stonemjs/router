export class RouteResponse {
  constructor ({
    content,
    headers,
    statusText,
    statusCode
  }) {
    this.content = content
    this.headers = headers
    this.statusText = statusText
    this.statusCode = statusCode
  }

  static fromResponse (response) {
    return new this(response)
  }

  static fromJson (content) {
    return new this({ content, statusCode: 200, headers: { 'Content-Type': 'application/json' } })
  }

  static fromString (content) {
    return new this({ content, statusCode: 200, headers: { 'Content-Type': 'text/html' } })
  }

  static empty () {
    return new this({ statusCode: 201, headers: { 'Content-Type': 'application/json' } })
  }

  prepare (requestContext) {}
}
