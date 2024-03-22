/**
 * Class representing a CallableDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../Route.mjs').Route} Route
 *
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
 */
export class CallableDispatcher {
  /**
   * Dispatch.
   *
   * @param {Request}  request
   * @param {Route}    route
   * @param {Function} callable
   *
   * @return {any}
   */
  dispatch (request, route, callable) {
    const params = route.parametersWithoutNulls()
    const context = {
      route,
      params,
      request,
      parameters: params,
      query: request.query ?? {},
      payload: request.body ?? {}
    }

    return callable(context)
  }
}
