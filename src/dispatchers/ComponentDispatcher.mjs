/**
 * Class representing a ComponentDispatcher.
 *
 * @author Mr. Stone <pierre.evens16@gmail.com>
 */
export class ComponentDispatcher {
  /**
   * Dispatch.
   *
   * @param {Object} request
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
