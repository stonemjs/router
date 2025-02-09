import { Router } from '../../src/Router'
import { RouterError } from '../../src/errors/RouterError'
import { IncomingEvent, OutgoingResponse, Container } from '@stone-js/core'
import { RouterCommand, routerCommandOptions } from '../../src/commands/RouterCommand'

describe('RouterCommand', () => {
  let routerMock: Router
  let containerMock: Container
  let routerCommand: RouterCommand
  let incomingEventMock: IncomingEvent

  beforeEach(() => {
    routerMock = {
      dumpRoutes: vi.fn(() => [
        { path: '/home', method: 'GET' },
        { path: '/about', method: 'POST' }
      ])
    } as unknown as Router

    containerMock = {
      resolve: vi.fn(() => routerMock)
    } as unknown as Container

    incomingEventMock = {
      getMetadataValue: vi.fn()
    } as unknown as IncomingEvent

    routerCommand = new RouterCommand(containerMock)
  })

  it('should throw RouterError if container is not provided', () => {
    // @ts-expect-error - Testing invalid input
    expect(() => new RouterCommand()).toThrowError(RouterError)
  })

  it('should resolve Router from the container and call dumpRoutes when action is list', async () => {
    incomingEventMock.getMetadataValue = vi.fn().mockReturnValue('list')

    const consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {})

    const response = await routerCommand.handle(incomingEventMock)

    expect(containerMock.resolve).toHaveBeenCalledWith(Router)
    expect(routerMock.dumpRoutes).toHaveBeenCalled()
    expect(consoleTableSpy).toHaveBeenCalledWith([
      { path: '/home', method: 'GET' },
      { path: '/about', method: 'POST' }
    ])
    expect(response).toBeInstanceOf(OutgoingResponse)

    consoleTableSpy.mockRestore()
  })

  it('should not call dumpRoutes when action is not list', async () => {
    incomingEventMock.getMetadataValue = vi.fn().mockReturnValue('unknown')

    const consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {})

    const response = await routerCommand.handle(incomingEventMock)

    expect(containerMock.resolve).not.toHaveBeenCalled()
    expect(routerMock.dumpRoutes).not.toHaveBeenCalled()
    expect(consoleTableSpy).not.toHaveBeenCalled()
    expect(response).toBeInstanceOf(OutgoingResponse)

    consoleTableSpy.mockRestore()
  })

  it('should match routerCommandOptions structure', () => {
    expect(routerCommandOptions).toEqual({
      name: 'router',
      alias: 'r',
      args: ['<action>'],
      desc: 'Router utility commands',
      options: expect.any(Function)
    })

    const yargsMock: any = {
      positional: vi.fn()
    }

    const options: any = routerCommandOptions.options

    options(yargsMock)

    expect(yargsMock.positional).toHaveBeenCalledWith('action', {
      type: 'string',
      choices: ['list'],
      desc: 'Display route definitions'
    })
  })
})
