import { Route } from '../src/Route'
import { RouterError } from '../src/errors/RouterError'
import { IIncomingEvent, IOutgoingResponse, RouterCallableAction, IControllerInstance } from '../src/declarations'
import { DispatcherOptions, callableDispatcher, controllerDispatcher } from '../src/dispatchers'

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
      const callable: RouterCallableAction = vi.fn().mockResolvedValue(mockResponse)

      const options: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        route: mockRoute,
        callable
      }

      const result = await callableDispatcher(options)

      expect(callable).toHaveBeenCalledWith({
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
        route: mockRoute
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
      const controller: IControllerInstance = {
        handleRequest: vi.fn().mockResolvedValue(mockResponse)
      }

      const options: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        route: mockRoute,
        controller,
        handler: 'handleRequest'
      }

      const result = await controllerDispatcher(options)

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
      const controller: IControllerInstance = {
        handleRequest: vi.fn()
      }

      const optionsWithoutHandler: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        route: mockRoute,
        controller
      }

      const optionsWithInvalidHandler: DispatcherOptions<IIncomingEvent, IOutgoingResponse> = {
        event: mockEvent,
        route: mockRoute,
        controller,
        handler: 'invalidHandler'
      }

      await expect(controllerDispatcher(optionsWithoutHandler)).rejects.toThrow(RouterError)
      await expect(controllerDispatcher(optionsWithInvalidHandler)).rejects.toThrow(
        'Handler invalidHandler not found in controller'
      )
    })
  })
})
