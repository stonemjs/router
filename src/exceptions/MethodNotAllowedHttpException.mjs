export class MethodNotAllowedHttpException extends Error {
  constructor (methods, message) {
    super()
    this.methods = methods
    this.message = message
    this.name = 'noowow.router'
  }
}