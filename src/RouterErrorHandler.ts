import { RouterError } from './errors/RouterError'
import { ILogger, IErrorHandler, Promiseable } from '@stone-js/core'
import { IOutgoingResponse, StoneIncomingEvent } from './declarations'

/**
 * RouterErrorHandler options.
 */
export interface RouterErrorHandlerOptions {
  logger: ILogger
}

/**
 * Class representing an RouterErrorHandler.
 */
export class RouterErrorHandler<
  IncomingEventType extends StoneIncomingEvent = StoneIncomingEvent,
  OutgoingResponseType extends IOutgoingResponse = IOutgoingResponse
> implements IErrorHandler<IncomingEventType, OutgoingResponseType> {
  private readonly logger: ILogger

  /**
   * Create an RouterErrorHandler.
   *
   * @param options - RouterErrorHandler options.
   */
  constructor ({ logger }: RouterErrorHandlerOptions) {
    if (logger === undefined) {
      throw new RouterError('Logger is required to create an RouterErrorHandler instance.')
    }

    this.logger = logger
  }

  /**
   * Handle an error.
   *
   * @param error - The error to handle.
   * @param event - The incoming http event.
   * @returns The outgoing http response.
   */
  public handle (error: Error, event: StoneIncomingEvent): Promiseable<OutgoingResponseType> {
    const types = ['json', 'html', 'xml', 'text']
    const message = (error: string): string | { error: string } => {
      return event.preferredType(types, 'html') === 'json' ? { error } : error
    }

    this.logger.error(error.message, { error })

    const response = ({
      RouteNotFoundError: { statusCode: 404, content: message('Not Found') },
      MethodNotAllowedError: { statusCode: 405, content: message('Method Not Allowed') }
    })[error.name] ?? { statusCode: 500, content: message('Internal Server Error') }

    return response as OutgoingResponseType
  }
}
