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

  static fromMetaResponse (response) {
    return new this({ content: response.getResponse(), statusCode: 200, headers: { 'Content-Type': 'application/json' } })
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

  async prepare (requestContext) {
    const content = typeof this.content === 'function' ? (await this.content()) : this.content
    return {
      content,
      headers: this.headers,
      statusText: this.statusText,
      statusCode: this.statusCode
    }
  }
}
