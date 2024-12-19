import { NextPipe } from '@stone-js/pipeline'
import { IIncomingEvent, IOutgoingResponse, RouterContext } from '../declarations'

/**
 * Class representing the RouterHandlerMiddleware.
 *
 * This middleware is responsible for handling routing and event processing within the kernel context.
 * It uses routers and event handlers to process incoming events and generate responses.
 *
 * @template IncomingEventType - The type of incoming event, extending IncomingEvent.
 * @template OutgoingResponseType - The type of outgoing response, extending OutgoingResponse.
 * @template RouterContextType - The type of kernel context, default is KernelContext.
 */
export class RouterHandlerMiddleware<
  IncomingEventType extends IIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse,
  RouterContextType extends RouterContext<IncomingEventType, OutgoingResponseType> = RouterContext<IncomingEventType, OutgoingResponseType>
> {
  /**
   * Handles the incoming event, processes it, and invokes the next middleware in the pipeline.
   *
   * @param context - The kernel context containing the incoming event and other data.
   * @param next - The next middleware in the pipeline.
   * @returns A promise that resolves to the outgoing response after processing.
   *
   * @throws {InitializationError} If no router or event handler is provided.
   */
  async handle (context: RouterContextType, next: NextPipe<RouterContextType, OutgoingResponseType>): Promise<OutgoingResponseType> {
    await context.route.bind(context.event)
    context.response = await context.route.run(context.event)
    return await next(context)
  }
}
