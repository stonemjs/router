/**
 * Class representing a DefaultDispatcher.
 *
 * @author Mr. Stone <pierre.evens16@gmail.com>
 */
export class DefaultDispatcher {
  /**
   * Dispatch.
   *
   * @param {Object}   request
   * @param {Route}    route
   * @param {Function} callable
   * 
   * @return {any}
   */
  dispatch (request, route) {
    const entities = route.bindingEntities() ?? {}
    const params   = route.parametersWithoutNulls() ?? {}
    const context = {
      ...entities,
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
