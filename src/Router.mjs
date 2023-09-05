export class Router {
  constructor () {

  }

  static METHODS = [
    'GET',
    'POST',
    'PUT',
    'HEAD',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ]

  match (pathInfo) {}

  generate (nameOrPath, params, query, hash) {}
}