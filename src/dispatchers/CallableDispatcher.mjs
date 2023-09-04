export class CallableDispatcher {
  constructor({
    request,
    container,
  }) {
    this._request = request
    this._container = container
  }

  dispatch (route, callable) {
    return callable({
      route,
      request: this._request,
      container: this._container,
      parameters: route.parametersWithoutNulls()
    })
  }
}