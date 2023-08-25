import { Mock } from 'vitest'
import { Route } from '../src/Route'
import { domainRegex, pathRegex } from '../src/utils'
import { IIncomingEvent, IOutgoingResponse } from '../src/declarations'
import { MatcherOptions, hostMatcher, methodMatcher, protocolMatcher, uriMatcher } from '../src/matchers'

// Mock dependencies
vi.mock('../src/Route', () => ({
  Route: vi.fn().mockImplementation(() => ({
    getOption: vi.fn(),
    isHttpOnly: vi.fn(),
    isHttpsOnly: vi.fn(),
    options: {}
  }))
}))

vi.mock('../src/utils', () => ({
  domainRegex: vi.fn(),
  pathRegex: vi.fn()
}))

describe('Matchers', () => {
  let mockEvent: IIncomingEvent
  let mockRoute: Route<IIncomingEvent, IOutgoingResponse>
  let matcherOptions: MatcherOptions<IIncomingEvent, IOutgoingResponse>

  beforeEach(() => {
    mockEvent = {
      host: 'example.com',
      method: 'GET',
      isSecure: true,
      decodedPathname: '/test',
      pathname: '/test'
    } as unknown as IIncomingEvent

    mockRoute = new Route({ path: '/test/:id' } as any)

    matcherOptions = { event: mockEvent, route: mockRoute }
  })

  describe('hostMatcher', () => {
    it('should return true if domainRegex is undefined', () => {
      (domainRegex as Mock).mockReturnValue(undefined)

      const result = hostMatcher(matcherOptions)
      expect(result).toBe(true)
      expect(domainRegex).toHaveBeenCalledWith(mockRoute.options)
    })

    it('should return true if host matches domainRegex', () => {
      (domainRegex as Mock).mockReturnValue({ test: vi.fn().mockReturnValue(true) })

      const result = hostMatcher(matcherOptions)
      expect(result).toBe(true)
      expect(domainRegex).toHaveBeenCalledWith(mockRoute.options)
    })

    it('should return false if host does not match domainRegex', () => {
      (domainRegex as Mock).mockReturnValue({ test: vi.fn().mockReturnValue(false) })

      const result = hostMatcher(matcherOptions)
      expect(result).toBe(false)
      expect(domainRegex).toHaveBeenCalledWith(mockRoute.options)
    })
  })

  describe('methodMatcher', () => {
    it('should return true if route method matches event method', () => {
      mockRoute.getOption = vi.fn().mockReturnValue('GET')

      const result = methodMatcher(matcherOptions)
      expect(result).toBe(true)
      expect(mockRoute.getOption).toHaveBeenCalledWith('method')
    })

    it('should return false if route method does not match event method', () => {
      mockRoute.getOption = vi.fn().mockReturnValue('POST')

      const result = methodMatcher(matcherOptions)
      expect(result).toBe(false)
      expect(mockRoute.getOption).toHaveBeenCalledWith('method')
    })
  })

  describe('protocolMatcher', () => {
    it('should return false if route isHttpOnly and event is secure', () => {
      mockRoute.isHttpOnly = vi.fn().mockReturnValue(true)
      // @ts-expect-error - isSecure is read-only
      mockEvent.isSecure = true

      const result = protocolMatcher(matcherOptions)
      expect(result).toBe(false)
      expect(mockRoute.isHttpOnly).toHaveBeenCalled()
    })

    it('should return true if route isHttpOnly and event is not secure', () => {
      mockRoute.isHttpOnly = vi.fn().mockReturnValue(true)
      // @ts-expect-error - isSecure is read-only
      mockEvent.isSecure = false

      const result = protocolMatcher(matcherOptions)
      expect(result).toBe(true)
      expect(mockRoute.isHttpOnly).toHaveBeenCalled()
    })

    it('should return true if route isHttpsOnly and event is secure', () => {
      mockRoute.isHttpsOnly = vi.fn().mockReturnValue(true)
      // @ts-expect-error - isSecure is read-only
      mockEvent.isSecure = true

      const result = protocolMatcher(matcherOptions)
      expect(result).toBe(true)
      expect(mockRoute.isHttpsOnly).toHaveBeenCalled()
    })

    it('should return false if route isHttpsOnly and event is not secure', () => {
      mockRoute.isHttpsOnly = vi.fn().mockReturnValue(true)
      // @ts-expect-error - isSecure is read-only
      mockEvent.isSecure = false

      const result = protocolMatcher(matcherOptions)
      expect(result).toBe(false)
      expect(mockRoute.isHttpsOnly).toHaveBeenCalled()
    })

    it('should return true if no protocol restrictions are set', () => {
      mockRoute.isHttpOnly = vi.fn().mockReturnValue(false)
      mockRoute.isHttpsOnly = vi.fn().mockReturnValue(false)

      const result = protocolMatcher(matcherOptions)
      expect(result).toBe(true)
      expect(mockRoute.isHttpOnly).toHaveBeenCalled()
      expect(mockRoute.isHttpsOnly).toHaveBeenCalled()
    })
  })

  describe('uriMatcher', () => {
    it('should return true if pathRegex matches event pathname', () => {
      (pathRegex as Mock).mockReturnValue({ test: vi.fn().mockReturnValue(true) })

      const result = uriMatcher({ event: { ...mockEvent, decodedPathname: undefined } as any, route: mockRoute })
      expect(result).toBe(true)
      expect(pathRegex).toHaveBeenCalledWith(mockRoute.options)
    })

    it('should return false if pathRegex does not match event pathname', () => {
      (pathRegex as Mock).mockReturnValue({ test: vi.fn().mockReturnValue(false) })

      const result = uriMatcher(matcherOptions)
      expect(result).toBe(false)
      expect(pathRegex).toHaveBeenCalledWith(mockRoute.options)
    })
  })
})
