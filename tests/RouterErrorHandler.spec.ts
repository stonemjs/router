import { IBlueprint, ILogger } from '@stone-js/core'
import { RouterError } from '../src/errors/RouterError'
import { RouterErrorHandler } from '../src/RouterErrorHandler'
import { RouteNotFoundError } from '../src/errors/RouteNotFoundError'
import { MethodNotAllowedError } from '../src/errors/MethodNotAllowedError'

describe('RouterErrorHandler', () => {
  const event: any = {}
  let mockLogger: ILogger
  let mockBlueprint: IBlueprint
  let handler: RouterErrorHandler

  beforeEach(() => {
    mockLogger = {
      error: vi.fn()
    } as unknown as ILogger

    mockBlueprint = {
      get: vi.fn().mockReturnValue()
    } as unknown as IBlueprint

    handler = new RouterErrorHandler({ logger: mockLogger, blueprint: mockBlueprint })
  })

  test('should throw an RouterError if blueprint is not provided', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => new RouterErrorHandler({})).toThrowError(RouterError)
  })

  test('should throw an RouterError if logger is not provided', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => new RouterErrorHandler({ blueprint: mockBlueprint })).toThrowError(RouterError)
  })

  test('should throw an RouterError when the responseResolver is undefined', async () => {
    mockBlueprint.get = vi.fn().mockReturnValue(undefined)
    const error = new RouteNotFoundError('Resource not found')

    await expect(async () => await handler.handle(error, event)).rejects.toThrowError(RouterError)
  })

  test('should log an error and return OutgoingResponse for RouteNotFoundError', async () => {
    const error = new RouteNotFoundError('Resource not found')

    const response = await handler.handle(error, event)

    expect(mockLogger.error).toHaveBeenCalledWith('Resource not found', { error })
    expect(response).toEqual({ statusCode: 404 })
  })

  test('should log an error and return OutgoingResponse for MethodNotAllowedError', async () => {
    const error = new MethodNotAllowedError('Method not allowed')

    const response = await handler.handle(error, event)

    expect(mockLogger.error).toHaveBeenCalledWith('Method not allowed', { error })
    expect(response).toEqual({ statusCode: 405 })
  })

  test('should log an error and return an OutgoingResponse', async () => {
    const error = new RouterError('Custom error')

    const response = await handler.handle(error, event)

    expect(mockLogger.error).toHaveBeenCalledWith('Custom error', { error })
    expect(response).toEqual({ statusCode: 500 })
  })

  test('should log an error and return OutgoingResponse for unknown error types', async () => {
    const error = new Error('Unknown error')

    const response = await handler.handle(error, event)

    expect(mockLogger.error).toHaveBeenCalledWith('Unknown error', { error })
    expect(response).toEqual({ statusCode: 500 })
  })
})
