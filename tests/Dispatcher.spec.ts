import { Route } from '../src/Route'
import { RouterError } from '../src/errors/RouterError'
import { FunctionalEventHandler, IEventHandler, IIncomingEvent, IOutgoingResponse } from '../src/declarations'
import { DispatcherOptions, callableDispatcher, handlerDispatcher } from '../src/dispatchers'

// Mock dependencies
vi.mock('../src/Route', () => ({
  Route: vi.fn().mockImplementation(() => ({
    getDefinedParams: vi.fn().mockReturnValue({ id: '123' }),
    query: { search: 'test' }
  }))
}))

describe('Dispatcher Tests', () => {
  let mockEvent: IIncomingEvent
  let mockResponse: IOutgoingResponse
  let mockRoute: Route<IIncomingEvent, IOutgoingResponse>

  beforeEach(() => {
    mockEvent = {
      body: { key: 'value' }
    } as unknown as IIncomingEvent

    mockRoute = new Route({ path: '/test/:id' } as any)

    mockResponse = {
      status: 200,
      body: 'OK'
    } as unknown as IOutgoingResponse
  })

  /**
   * Tests for callableDispatcher
   */
  describe('callableDispatcher', () => {
    it('should execute callable and return response', async () => {
      const handler: FunctionalEventHandler<IIncomingEvent, IOutgoingResponse> = vi.fn().mockResolvedValue(mockResponse)

      const options: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        handler
      }

      const result = await callableDispatcher(options)

      expect(handler).toHaveBeenCalledWith({
        event: mockEvent,
        route: mockRoute,
        params: { id: '123' },
        body: mockEvent.body,
        query: { search: 'test' }
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw RouterError if callable is not provided', async () => {
      const options: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        handler: undefined
      }

      await expect(callableDispatcher(options)).rejects.toThrow(RouterError)
      await expect(callableDispatcher(options)).rejects.toThrow('No callable function found')
    })
  })

  /**
   * Tests for controllerDispatcher
   */
  describe('controllerDispatcher', () => {
    it('should execute controller handler and return response', async () => {
      const controller: IEventHandler<IIncomingEvent, IOutgoingResponse> = {
        handleRequest: vi.fn().mockResolvedValue(mockResponse)
      }

      const options: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        handler: controller,
        action: 'handleRequest'
      }

      const result = await handlerDispatcher(options)

      expect(controller.handleRequest).toHaveBeenCalledWith({
        event: mockEvent,
        route: mockRoute,
        params: { id: '123' },
        body: mockEvent.body,
        query: { search: 'test' }
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw RouterError if controller or handler is missing', async () => {
      const controller: IEventHandler<IIncomingEvent, IOutgoingResponse> = {
        handleRequest: vi.fn()
      }

      const optionsWithoutHandler: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        handler: controller
      }

      const optionsWithInvalidHandler: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        handler: controller,
        action: 'invalidHandler'
      }

      await expect(handlerDispatcher(optionsWithoutHandler)).rejects.toThrow(RouterError)
      await expect(handlerDispatcher(optionsWithInvalidHandler)).rejects.toThrow(
        'Handler invalidHandler not found in controller'
      )
    })
  })
})
