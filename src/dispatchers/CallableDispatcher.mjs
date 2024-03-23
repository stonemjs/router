/**
 * Class representing a CallableDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class CallableDispatcher {
  /**
   * Dispatch.
   *
   * @param {external:Request}  request
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
