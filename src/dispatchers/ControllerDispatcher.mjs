import { MetaProperty } from '@stone-js/common'

/**
 * Class representing a ControllerDispatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class ControllerDispatcher {
  /**
   * Dispatch.
   *
   * @param {IncomingEvent} event
   * @param {Route}   route
   * @param {any}     controller
   * @param {String}  method
   *
   * @return {any}
   */
  async dispatch (event, route, controller, method) {
    let response
    const params = route.parametersWithoutNulls()
    const context = {
      event,
      route,
      params,
      request: event,
      parameters: params,
      body: event.body ?? {},
      query: event.query ?? {},
      payload: event.body ?? {}
    }

    if (controller.callAction) {
      response = await controller.callAction(method, context)
    } else {
      response = await controller[method](context)
    }

    if (response instanceof MetaProperty) {
      response = await response.invoke(controller, context)
    }

    return response
  }
}
