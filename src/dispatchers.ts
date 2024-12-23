import { Route } from './Route'
import { RouterError } from './errors/RouterError'
import { IControllerInstance, IIncomingHttpEvent, IOutgoingResponse, RouterActionContext, RouterCallableAction } from './declarations'

export interface DispatcherOptions<
  IncomingEventType extends IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse
> {
  handler?: string
  event: IncomingEventType
  callable?: RouterCallableAction
  controller?: IControllerInstance
  route: Route<IncomingEventType, OutgoingResponseType>
}

export const callableDispatcher = async <
  IncomingEventType extends IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse
> ({ event, route, callable }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> => {
  const params = route.getDefinedParams()
  const context: RouterActionContext<IncomingEventType, OutgoingResponseType> = {
    event,
    route,
    params,
    body: event.body,
    query: route.query
  }

  if (typeof callable === 'function') {
    return await callable(context)
  }

  throw new RouterError('No callable function found')
}

export const controllerDispatcher = async <
  IncomingEventType extends IIncomingHttpEvent,
  OutgoingResponseType extends IOutgoingResponse
> ({ event, route, controller, handler }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> => {
  const params = route.getDefinedParams()
  const context: RouterActionContext<IncomingEventType, OutgoingResponseType> = {
    event,
    route,
    params,
    body: event.body,
    query: route.query
  }

  if (controller !== undefined && handler !== undefined && handler in controller) {
    return await controller[handler](context)
  }

  throw new RouterError(`Handler ${String(handler)} not found in controller`)
}
