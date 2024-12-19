import { RuntimeError } from '@stone-js/core'

/**
 * Custom error for Integration layer operations.
 */
export class RouteNotFoundError extends RuntimeError {
  constructor (message: string) {
    super(message)
    this.name = 'RouteNotFoundError'
  }
}
