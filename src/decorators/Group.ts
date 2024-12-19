import { GROUP_KEY } from './constants';
import { DecoratorGroupRouteDefinition } from '../declarations';
import { classDecoratorLegacyWrapper, ClassType, setMetadata } from '@stone-js/core';


export interface GroupOptions extends DecoratorGroupRouteDefinition {}


export const Group = <T extends ClassType = ClassType>(path: string, options?: GroupOptions): ClassDecorator => {
  return classDecoratorLegacyWrapper((_target: T, context: ClassDecoratorContext<T>): undefined => {
    setMetadata(context, GROUP_KEY, { ...options, path });
  })
};
