import { Mock } from 'vitest'
import { NextPipe } from '@stone-js/pipeline'
import { NODE_CONSOLE_PLATFORM } from '../../src/constants'
import { RouterCommand, routerCommandOptions } from '../../src/commands/RouterCommand'
import { ClassType, ConfigContext, getMetadata, hasMetadata, IBlueprint } from '@stone-js/core'
import { RouteDefinitionsMiddleware, SetRouterCommandsMiddleware } from '../../src/middleware/configMiddleware'

/* eslint-disable @typescript-eslint/no-extraneous-class */

vi.mock('@stone-js/core', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    hasMetadata: vi.fn(() => true),
    getMetadata: vi.fn()
      .mockReturnValueOnce([{ path: '/child1' }, { path: '/child2' }])
      .mockReturnValueOnce({ path: '/parent1' })
      .mockReturnValueOnce([])
      .mockReturnValueOnce({ path: '/parent2' })
  }
})

describe('RouteDefinitionsMiddleware', () => {
  let mockModules: ClassType[]
  let mockBlueprint: IBlueprint
  let mockNext: NextPipe<ConfigContext, IBlueprint>

  beforeEach(() => {
    mockBlueprint = {
      add: vi.fn()
    } as unknown as IBlueprint

    mockNext = vi.fn((context) => context.blueprint)

    mockModules = [
      class MockModule1 {},
      class MockModule2 {}
    ]
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should add route definitions for modules with GROUP_KEY metadata', async () => {
    // Act
    const result = await RouteDefinitionsMiddleware(
      { modules: mockModules, blueprint: mockBlueprint },
      mockNext
    )

    // Assert
    expect(hasMetadata).toHaveBeenCalledTimes(2)
    expect(getMetadata).toHaveBeenCalledTimes(4)
    expect(mockBlueprint.add).toHaveBeenCalledTimes(2)
    expect(mockBlueprint.add).toHaveBeenNthCalledWith(
      1,
      'stone.router.definitions',
      {
        path: '/parent1',
        children: [{ path: '/child1' }, { path: '/child2' }],
        action: mockModules[0]
      }
    )
    expect(mockBlueprint.add).toHaveBeenNthCalledWith(
      2,
      'stone.router.definitions',
      {
        path: '/parent2',
        children: [],
        action: { handle: mockModules[1] }
      }
    )
    expect(result).toEqual(mockBlueprint)
  })

  it('should not add route definitions if no module has GROUP_KEY metadata', async () => {
    // Arrange
    (hasMetadata as Mock).mockReturnValue(false)

    // Act
    const result = await RouteDefinitionsMiddleware(
      { modules: mockModules, blueprint: mockBlueprint },
      mockNext
    )

    // Assert
    expect(hasMetadata).toHaveBeenCalledTimes(2)
    expect(getMetadata).not.toHaveBeenCalled()
    expect(mockBlueprint.add).not.toHaveBeenCalled()
    expect(result).toEqual(mockBlueprint)
  })

  it('should add router commands to adapters with NODE_CONSOLE_PLATFORM', async () => {
    // Arrange
    const adapter1: any = {
      platform: NODE_CONSOLE_PLATFORM,
      commands: []
    }

    const adapter2: any = {
      platform: 'OTHER_PLATFORM',
      commands: []
    }

    mockBlueprint.get = vi.fn().mockReturnValue([adapter1, adapter2])

    // Act
    const result = await SetRouterCommandsMiddleware(
      { modules: mockModules, blueprint: mockBlueprint },
      mockNext
    )

    // Assert
    expect(mockBlueprint.get).toHaveBeenCalledWith('stone.adapters', [])
    expect(adapter1.commands).toEqual([
      [RouterCommand, routerCommandOptions]
    ])
    expect(adapter2.commands).toEqual([]) // Ensure the non-NODE_CONSOLE_PLATFORM adapter remains unchanged
    expect(mockNext).toHaveBeenCalledWith({ modules: mockModules, blueprint: mockBlueprint })
    expect(result).toEqual(mockBlueprint)
  })

  it('should handle empty adapters array gracefully', async () => {
    // Arrange
    mockBlueprint.get = vi.fn().mockReturnValue([])

    // Act
    const result = await SetRouterCommandsMiddleware(
      { modules: mockModules, blueprint: mockBlueprint },
      mockNext
    )

    // Assert
    expect(mockBlueprint.get).toHaveBeenCalledWith('stone.adapters', [])
    expect(mockNext).toHaveBeenCalledWith({ modules: mockModules, blueprint: mockBlueprint })
    expect(result).toEqual(mockBlueprint)
  })

  it('should not modify adapters without NODE_CONSOLE_PLATFORM', async () => {
    // Arrange
    const adapter: any = {
      platform: 'OTHER_PLATFORM',
      commands: []
    }

    mockBlueprint.get = vi.fn().mockReturnValue([adapter])

    // Act
    const result = await SetRouterCommandsMiddleware(
      { modules: mockModules, blueprint: mockBlueprint },
      mockNext
    )

    // Assert
    expect(mockBlueprint.get).toHaveBeenCalledWith('stone.adapters', [])
    expect(adapter.commands).toEqual([]) // Commands remain unchanged
    expect(mockNext).toHaveBeenCalledWith({ modules: mockModules, blueprint: mockBlueprint })
    expect(result).toEqual(mockBlueprint)
  })

  it('should call next with updated context', async () => {
    // Arrange
    mockBlueprint.get = vi.fn().mockReturnValue([])

    // Act
    const result = await SetRouterCommandsMiddleware(
      { modules: mockModules, blueprint: mockBlueprint },
      mockNext
    )

    // Assert
    expect(mockNext).toHaveBeenCalledWith({ modules: mockModules, blueprint: mockBlueprint })
    expect(result).toEqual(mockBlueprint)
  })
})
