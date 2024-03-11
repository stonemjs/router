import { ProtocolMatcher } from '../../src/matchers/ProtocolMatcher.mjs'

const matcher = new ProtocolMatcher()

describe('ProtocolMatcher', () => {
  describe('matches', () => {
    it('Must return `true` when protocol is not defined in route', () => {
      // Arrange
      const request = { isSecure: false }
      const route = { isHttpOnly: () => false, isHttpsOnly: () => false }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `true` when protocol is defined to http in both route and request', () => {
      // Arrange
      const request = { isSecure: false }
      const route = { isHttpOnly: () => true, isHttpsOnly: () => false }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `false` when protocol is defined to http in route and https in request', () => {
      // Arrange
      const request = { isSecure: true }
      const route = { isHttpOnly: () => true, isHttpsOnly: () => false }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(false)
    })

    it('Must return `true` when protocol is defined to https in both route and request', () => {
      // Arrange
      const request = { isSecure: true }
      const route = { isHttpOnly: () => false, isHttpsOnly: () => true }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `false` when protocol is defined to https in route and http in request', () => {
      // Arrange
      const request = { isSecure: false }
      const route = { isHttpOnly: () => false, isHttpsOnly: () => true }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(false)
    })
  })
})
