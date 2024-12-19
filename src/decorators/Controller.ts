import { GROUP_KEY } from './constants';
import { DecoratorGroupRouteDefinition } from '../declarations';
import { classDecoratorLegacyWrapper, ClassType, setMetadata, SERVICE_KEY } from '@stone-js/core';


export interface ControllerOptions extends DecoratorGroupRouteDefinition {}


export const Controller = <T extends ClassType = ClassType>(path: string, options?: ControllerOptions): ClassDecorator => {
  return classDecoratorLegacyWrapper((_target: T, context: ClassDecoratorContext<T>): undefined => {
    setMetadata(context, GROUP_KEY, { ...options, path });
    setMetadata(context, SERVICE_KEY, { singleton: true });
  })
};
