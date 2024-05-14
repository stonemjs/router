import { Router } from '@stone-js/router'
import { AbstractCommand } from '@stone-js/cli'

/**
 * Class representing a RouterCommand.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class RouterCommand extends AbstractCommand {
  /**
   * Command definitions.
   *
   * @return {Object} metadata.
   */
  get metadata () {
    return { name: 'router' }
  }

  /**
   * Register command.
   *
   * @param   {Object} builder - Yargs builder.
   * @returns
   */
  registerCommand (builder) {
    builder
      .command({
        command: 'router <action>',
        desc: 'Router utils commands',
        builder: (yargs) => {
          return yargs
            .positional('action', {
              type: 'string',
              choices: ['list'],
              desc: 'Dump route definitions'
            })
        }
      })
  }

  /**
   * Handle IncomingEvent.
   *
   * @param   {IncomingEvent} event
   * @returns
   */
  handle (event) {
    if (event.get('action') === 'list') {
      const events = this.container.make('events')
      const options = this.config.get('router', {})
      const router = new Router(options, this.container, events)

      // Dump routes definitions du console.
      console.table(router.dumpRoutes())
    }
  }
}
