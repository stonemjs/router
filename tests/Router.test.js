import { Router } from '../src/Router.mjs'

describe('Router', () => {
  test('Init', () => {
    expect(Router.METHODS.length).toEqual(5)
  })
})
