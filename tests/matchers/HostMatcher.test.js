import { HostMatcher } from '../../src/matchers/HostMatcher.mjs'

const matcher = new HostMatcher()
const request = { host: 'example.com' }

describe('HostMatcher', () => {
  describe('matches', () => {
    it('Must return `true` when domainRegex return null', () => {
      // Arrange
      const route = { domainRegex () { return null } }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `true` when regex matches', () => {
      // Arrange
      const route = { domainRegex () { return /^.+?\..+?$/ } }

      // Act
      const result = matcher.matches(route, request)

      // Assert
      expect(result).toBe(true)
    })

    it('Must return `false` when regex not matches', () => {
      // Arrange
      const route = { domainRegex () { return /^.+?\..+?$/ } }

      // Act
      const result = matcher.matches(route, { host: 'lorem' })

      // Assert
      expect(result).toBe(false)
    })
  })
})
