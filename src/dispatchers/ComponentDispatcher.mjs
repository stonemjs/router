/**
 * Class representing a ComponentDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../Route.mjs').Route} Route
 *
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
 */
export class ComponentDispatcher {
  /**
   * Dispatch.
   *
   * @param {Request} request
   * @param {Route}  route
   *
   * @return {any}
   */
  dispatch (request, route) {
    const params = route.parametersWithoutNulls()
    const context = {
      route,
      params,
      request,
      parameters: params,
      query: request.query ?? {},
      payload: request.body ?? {}
    }

    return {
      context,
      action: route.action,
      actions: route.actions
    }
  }
}
