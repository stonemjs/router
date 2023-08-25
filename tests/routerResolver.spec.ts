import { Mock } from 'vitest'
import { Router } from '../src/Router'
import { routerResolver } from '../src/resolvers'
import { IContainer, IIncomingEvent, IOutgoingResponse } from '../src/declarations'

describe('routerResolver', () => {
  let mockContainer: IContainer
  let mockRouter: Router<IIncomingEvent, IOutgoingResponse>

  beforeEach(() => {
    mockRouter = {
      handle: vi.fn()
    } as unknown as Router<IIncomingEvent, IOutgoingResponse>

    mockContainer = {
      resolve: vi.fn().mockReturnValue(mockRouter)
    } as unknown as IContainer
  })

  it('should resolve and return an instance of Router from the container', () => {
    const result = routerResolver<IIncomingEvent, IOutgoingResponse>(mockContainer)

    expect(mockContainer.resolve).toHaveBeenCalledWith(Router)
    expect(result).toBe(mockRouter)
  })

  it('should throw an error if container cannot resolve Router', () => {
    (mockContainer.resolve as Mock).mockImplementation(() => {
      throw new Error('Failed to resolve Router')
    })

    expect(() => routerResolver<IIncomingEvent, IOutgoingResponse>(mockContainer)).toThrowError('Failed to resolve Router')
    expect(mockContainer.resolve).toHaveBeenCalledWith(Router)
  })
})
