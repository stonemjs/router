/**
 * Class representing a CallableDispatcher.
 *
 * @author Mr. Stone <pierre.evens16@gmail.com>
 * 
 * @external Container
 * @see {@link https://github.com/stonemjs/service-container/blob/main/src/Container.mjs|Container}
 * 
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
 */
export class CallableDispatcher {
  #container

  /**
   * Create a callableDispatcher.
   *
   * @param {Container} container
   */
  constructor ({
    container
  }) {
    this.#container = container
  }

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
    const entities = route.bindingEntities() ?? {}
    const params   = route.parametersWithoutNulls() ?? {}
    const context = {
      ...entities,
      route,
      params,
      request,
      parameters: params,
      query: request.query ?? {},
      payload: request.body ?? {},
      container: this.#container
    }

    return callable(context)
  }
}
