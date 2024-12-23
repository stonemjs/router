import { addBlueprint, classDecoratorLegacyWrapper, ClassType } from '@stone-js/core'
import { RouterBlueprint, routerBlueprint, RouterConfig } from '../config/RouterBlueprint'

export interface RoutingOptions extends RouterConfig {}

export const Routing = <T extends ClassType = ClassType>(options: RoutingOptions): ClassDecorator => {
  return classDecoratorLegacyWrapper<T>((target: T, context: ClassDecoratorContext<T>): undefined => {
    const blueprint: RouterBlueprint = { stone: { router: options } }
    addBlueprint(target, context, routerBlueprint, blueprint)
  })
}
