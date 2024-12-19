import { Argv } from 'yargs'
import { Router } from '../Router'
import { IContainer } from '../declarations'
import { RouterError } from '../errors/RouterError'
import { CommandOptions } from '@stone-js/node-cli-adapter'
import { IncomingEvent, OutgoingResponse } from '@stone-js/core'

export const routerCommandOptions: CommandOptions = {
  name: 'router',
  alias: 'r',
  args: ['<action>'],
  desc: 'Router utils commands',
  options: (yargs: Argv) => {
    return yargs
      .positional('action', {
        type: 'string',
        choices: ['list'],
        desc: 'Dump route definitions'
      })
  }
}

export class RouterCommand {
  private readonly container: IContainer

  constructor ({ container }: { container: IContainer }) {
    if (container === undefined) { throw new RouterError('Container is required to create a RouterCommand instance.') }

    this.container = container
  }

  /**
   * Handle the incoming event.
   */
  async handle (event: IncomingEvent): Promise<OutgoingResponse> {
    if (event.getMetadataValue<string>('action') === 'list') {
      console.table(this.container.resolve<Router>(Router).dumpRoutes())
    }

    return OutgoingResponse.create({ statusCode: 0 })
  }
}
