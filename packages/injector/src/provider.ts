/*
 * Deepkit Framework
 * Copyright (C) 2021 Deepkit UG, Marc J. Schmidt
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 *
 * You should have received a copy of the MIT License along with this program.
 */
import { AbstractClassType, ClassType, isClass } from '@deepkit/core';
import { InjectorToken } from './decorator';
import { InjectorModule } from './module';

export interface ProviderBase {
    /**
     * Per default all instances are singleton (scoped to its scope). Enabling transient makes the
     * Injector create always a new instance for every consumer.
     */
    transient?: true;
}

export type Token<T = any> = symbol | string | InjectorToken<T> | AbstractClassType<T>;

export interface ValueProvider<T> extends ProviderBase {
    /**
     * An injection token. Typically a class.
     */
    provide: Token<T>;

    /**
     * The value to inject.
     */
    useValue: T;
}

export interface ClassProvider<T> extends ProviderBase {
    /**
     * An injection token. Typically a class.
     */
    provide: Token<T>;

    /**
     * Class to instantiate for the `token`.
     */
    useClass?: ClassType<T>;
}

export interface ExistingProvider<T> extends ProviderBase {
    /**
     * An injection token. Typically a class.
     */
    provide: Token<T>;

    /**
     * Existing `token` to return. (equivalent to `injector.get(useExisting)`)
     */
    useExisting: ClassType<T>;
}

export interface FactoryProvider<T> extends ProviderBase {
    /**
     * An injection token. Typically a class.
     */
    provide: Token<T>;

    /**
     * A function to invoke to create a value for this `token`. The function is invoked with
     * resolved values of `token`s in the `deps` field.
     */
    useFactory: (...args: any[]) => T;

    /**
     * A list of `token`s which need to be resolved by the injector. The list of values is then
     * used as arguments to the `useFactory` function.
     */
    deps?: any[];
}

export type Provider<T = any> = ClassType | ValueProvider<T> | ClassProvider<T> | ExistingProvider<T> | FactoryProvider<T> | TagProvider<T>;

export type ProviderProvide<T = any> = ValueProvider<T> | ClassProvider<T> | ExistingProvider<T> | FactoryProvider<T>;

interface TagRegistryEntry<T> {
    tagProvider: TagProvider<T>;
    module: InjectorModule;
}

export class TagRegistry {
    constructor(
        public tags: TagRegistryEntry<any>[] = []
    ) {
    }

    register(tagProvider: TagProvider<any>, module: InjectorModule) {
        return this.tags.push({tagProvider, module});
    }

    resolve<T extends ClassType<Tag<any>>>(tag: T): TagRegistryEntry<InstanceType<T>>[] {
        return this.tags.filter(v => v.tagProvider.tag instanceof tag);
    }
}

export class TagProvider<T> {
    constructor(
        public provider: NormalizedProvider<T>,
        public tag: Tag<T>,
    ) {
    }
}

export class Tag<T, TP extends TagProvider<T> = TagProvider<T>> {
    _!: () => T;
    _2!: () => TP;

    constructor(
        public readonly services: T[] = []
    ) {
    }

    protected createTagProvider(provider: NormalizedProvider<any>): TP {
        return new TagProvider(provider, this) as TP;
    }

    static provide<
        P extends ClassType<T> | ValueProvider<T> | ClassProvider<T> | ExistingProvider<T> | FactoryProvider<T>,
        T extends ReturnType<InstanceType<B>['_']>,
        TP extends ReturnType<InstanceType<B>['_2']>,
        B extends ClassType<Tag<any>>>(this: B, provider: P): TP {
        const t = new this;

        if (isClass(provider)) {
            return t.createTagProvider({ provide: provider }) as TP;
        }

        return t.createTagProvider(provider as NormalizedProvider<T>) as TP;
    }
}

export interface ProviderScope {
    scope?: 'module' | 'rpc' | 'http' | 'cli' | string;
}

export type NormalizedProvider<T = any> = ProviderProvide<T> & ProviderScope;

export type ProviderWithScope<T = any> = ClassType | (ProviderProvide<T> & ProviderScope) | TagProvider<any>;

export function isScopedProvider(obj: any): obj is ProviderProvide & ProviderScope {
    return obj.provide && obj.hasOwnProperty('scope');
}

export function isValueProvider(obj: any): obj is ValueProvider<any> {
    return obj.provide && obj.hasOwnProperty('useValue');
}

export function isClassProvider(obj: any): obj is ClassProvider<any> {
    return obj.provide && !isValueProvider(obj) && !isExistingProvider(obj) && !isFactoryProvider(obj);
}

export function isExistingProvider(obj: any): obj is ExistingProvider<any> {
    return obj.provide && obj.hasOwnProperty('useExisting');
}

export function isFactoryProvider(obj: any): obj is FactoryProvider<any> {
    return obj.provide && obj.hasOwnProperty('useFactory');
}

export function isInjectionProvider(obj: any): obj is Provider<any> {
    return isValueProvider(obj) || isClassProvider(obj) || isExistingProvider(obj) || isFactoryProvider(obj);
}

export function isTransient(provider: ProviderWithScope): boolean {
    if (isClass(provider)) return false;
    if (provider instanceof TagProvider) return false;
    return provider.transient === true;
}


export function getProviders(
    providers: ProviderWithScope[],
    requestScope: 'module' | 'session' | 'request' | string,
) {
    const result: Provider<any>[] = [];

    function normalize(provider: ProviderWithScope<any>): Provider<any> {
        if (isClass(provider)) {
            return provider;
        }

        return provider;
    }

    for (const provider of providers) {
        if (isClass(provider)) {
            if (requestScope === 'module') result.push(provider);
            continue;
        }

        if (isClass(provider)) {
            if (requestScope === 'module') result.push(provider);
            continue;
        }

        const scope = isScopedProvider(provider) ? provider.scope : 'module';
        if (scope === requestScope) {
            result.push(normalize(provider));
        }
    }

    return result;
}
