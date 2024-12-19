import { Route } from "./Route";
import { RouterError } from "./errors/RouterError";
import { IIncomingEvent, IOutgoingResponse, RouteParams } from "./declarations";

export type RouterCallableAction = <ContextType, OutgoingResponseType extends IOutgoingResponse>(context: ContextType) => OutgoingResponseType

export interface DispatcherContext<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> {
  body?: unknown
  params: RouteParams
  event: IncomingEventType
  query: Record<string, string>
  route: Route<IncomingEventType, OutgoingResponseType>
}

export interface DispatcherOptions<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> {
  body: unknown
  method: string
  params: RouteParams
  event: IncomingEventType
  query: Record<string, string>
  callable: RouterCallableAction
  controller: Record<string, RouterCallableAction>
  route: Route<IncomingEventType, OutgoingResponseType>
}

export const callableDispatcher = async <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> ({ event, route, callable }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> => {
  const params = route.getDefinedParams()
  const context: DispatcherContext<IncomingEventType, OutgoingResponseType> = {
    event,
    route,
    params,
    body: event.body,
    query: event.query ?? {},
  }

  return await callable(context) as OutgoingResponseType
}

export const controllerDispatcher = async <
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse
> ({ event, route, controller, method }: DispatcherOptions<IncomingEventType, OutgoingResponseType>): Promise<OutgoingResponseType> => {
  const params = route.getDefinedParams()
  const context: DispatcherContext<IncomingEventType, OutgoingResponseType> = {
    event,
    route,
    params,
    body: event.body,
    query: event.query ?? {},
  }

  if (method in controller) {
    return await controller[method](context)
  }
  
  throw new RouterError(`Method ${method} not found in controller`)
}