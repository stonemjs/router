import { RouterError } from './errors/RouterError'
import { ILogger, IErrorHandler, IBlueprint } from '@stone-js/core'
import { IIncomingEvent, IOutgoingResponse, OutgoingResponseResolver } from './declarations'

/**
 * RouterErrorHandler options.
 */
export interface RouterErrorHandlerOptions {
  logger: ILogger
  blueprint: IBlueprint
}

/**
 * Class representing an RouterErrorHandler.
 */
export class RouterErrorHandler implements IErrorHandler<IIncomingEvent, IOutgoingResponse> {
  private readonly logger: ILogger
  private readonly blueprint: IBlueprint

  /**
   * Create an RouterErrorHandler.
   *
   * @param options - RouterErrorHandler options.
   */
  constructor ({ logger, blueprint }: RouterErrorHandlerOptions) {
    if (blueprint === undefined) {
      throw new RouterError('Blueprint is required to create an RouterErrorHandler instance.')
    }
    if (logger === undefined) {
      throw new RouterError('Logger is required to create an RouterErrorHandler instance.')
    }

    this.logger = logger
    this.blueprint = blueprint
  }

  /**
   * Handle an error.
   *
   * @param error - The error to handle.
   * @param _event - The incoming http event.
   * @returns The outgoing http response.
   */
  public async handle (error: Error, _event: IIncomingEvent): Promise<IOutgoingResponse> {
    const responseResolver = this.blueprint.get<OutgoingResponseResolver>('stone.router.responseResolver')

    this.logger.error(error.message, { error })

    const responseOptions = {
      RouteNotFoundError: { statusCode: 404 },
      MethodNotAllowedError: { statusCode: 405 }
    }[error.name] ?? { statusCode: 500 }

    if (responseResolver !== undefined) {
      return await responseResolver(responseOptions)
    } else {
      throw new RouterError('ResponseResolver is required to handle errors.')
    }
  }
}
