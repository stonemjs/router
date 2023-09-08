export class NotFoundHttpException extends Error {
  constructor (message) {
    super()
    this.message = message
    this.name = 'noowow.router'
  }
}
