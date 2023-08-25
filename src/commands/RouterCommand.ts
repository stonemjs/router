import { Router } from '../Router'
import { RouterError } from '../errors/RouterError'
import { IncomingEvent, OutgoingResponse } from '@stone-js/core'
import { CommandOptions, IArgv, IContainer } from '../declarations'

/**
 * Configuration for the `router` command.
 * Defines command name, alias, arguments, description, and options.
 */
export const routerCommandOptions: CommandOptions = {
  name: 'router',
  alias: 'r',
  args: ['<action>'],
  desc: 'Router utility commands',
  options: (yargs: IArgv) => {
    return yargs
      .positional('action', {
        type: 'string',
        choices: ['list'],
        desc: 'Display route definitions'
      })
  }
}

/**
 * Handles router-related commands by interacting with the Router instance.
 */
export class RouterCommand {
  private readonly container: IContainer

  /**
   * Initializes a new instance of `RouterCommand`.
   *
   * @param container - The dependency injection container for resolving the Router instance.
   * @throws {RouterError} If the container is not provided.
   */
  constructor ({ container }: { container: IContainer }) {
    if (container === undefined) {
      throw new RouterError('Container is required to create a RouterCommand instance.')
    }

    this.container = container
  }

  /**
   * Processes an incoming event and executes the specified router action.
   *
   * @param event - The event containing metadata for router actions.
   * @returns A promise resolving to an `OutgoingResponse`.
   */
  async handle (event: IncomingEvent): Promise<OutgoingResponse> {
    const action = event.getMetadataValue<string>('action')

    if (action === 'list') {
      const router = this.container.resolve<Router>(Router)
      console.table(router.dumpRoutes())
    }

    return OutgoingResponse.create({ statusCode: 0 })
  }
}
