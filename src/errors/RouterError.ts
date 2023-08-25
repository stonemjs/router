import { RuntimeError } from '@stone-js/core'

/**
 * Custom error for Integration layer operations.
 */
export class RouterError extends RuntimeError {
  constructor (message: string) {
    super(message)
    this.name = 'RouterError'
  }
}
