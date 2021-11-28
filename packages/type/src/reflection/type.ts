/*
 * Deepkit Framework
 * Copyright (c) Deepkit UG, Marc J. Schmidt
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 *
 * You should have received a copy of the MIT License along with this program.
 */

import { ClassType, getClassName, indent, isArray } from '@deepkit/core';
import { resolveRuntimeType } from './processor';

export enum ReflectionVisibility {
    public,
    protected,
    private,
}

export enum ReflectionKind {
    never,
    any,
    void,
    string,
    number,
    boolean,
    symbol,
    bigint,
    null,
    undefined,

    literal,
    property,
    method,
    function,
    parameter,

    promise,

    /**
     * Uint8Array, Date, custom classes, Set, Map, etc
     */
    class,

    template,
    enum,
    union,
    intersection,

    array,
    tuple,
    tupleMember,
    enumMember,

    rest,
    regexp,

    objectLiteral,
    indexSignature,
    propertySignature,
    methodSignature,

    infer,
}

export interface TypeBrandable {
    brands?: Type[];
}

export function isBrandable(type: Type): type is TypeVoid | TypeString | TypeNumber | TypeBoolean | TypeBigInt | TypeNull | TypeUndefined | TypeLiteral {
    return type.kind === ReflectionKind.void || type.kind === ReflectionKind.string || type.kind === ReflectionKind.number || type.kind === ReflectionKind.boolean
        || type.kind === ReflectionKind.bigint || type.kind === ReflectionKind.null || type.kind === ReflectionKind.undefined || type.kind === ReflectionKind.literal;
}

export interface TypeNever {
    kind: ReflectionKind.never,
}

export interface TypeAny {
    kind: ReflectionKind.any,
}

export interface TypeVoid extends TypeBrandable {
    kind: ReflectionKind.void,
}

export interface TypeString extends TypeBrandable {
    kind: ReflectionKind.string,
}

/**
 * note: Checks are based on range checks (>, <, etc), so when adding
 * new types a check is required for all code using `TypeNumberBrand`.
 */
export enum TypeNumberBrand {
    integer,

    int8,
    int16,
    int32,

    uint8,
    uint16,
    uint32,

    float,
    float32,
    float64,
}

export interface TypeNumber extends TypeBrandable {
    kind: ReflectionKind.number,
    brand?: TypeNumberBrand; //built in brand
}

export interface TypeBoolean extends TypeBrandable {
    kind: ReflectionKind.boolean,
}

export interface TypeBigInt extends TypeBrandable {
    kind: ReflectionKind.bigint,
}

export interface TypeSymbol extends TypeBrandable {
    kind: ReflectionKind.symbol,
}

export interface TypeNull extends TypeBrandable {
    kind: ReflectionKind.null,
}

export interface TypeUndefined extends TypeBrandable {
    kind: ReflectionKind.undefined,
}

export interface TypeLiteral extends TypeBrandable {
    kind: ReflectionKind.literal,
    literal: symbol | string | number | boolean | bigint;
}

export interface TypeRegexp extends TypeBrandable {
    kind: ReflectionKind.regexp;
}

export interface TypeLiteralMember {
    visibility: ReflectionVisibility,
    abstract?: true;
    optional?: true,
    readonly?: true;
}

export interface TypeParameter {
    kind: ReflectionKind.parameter,
    name: string;
    type: Type;

    //parameter could be a property as well if visibility is set
    visibility?: ReflectionVisibility,
    readonly?: true;
    optional?: true,
}

export interface TypeMethod extends TypeLiteralMember {
    kind: ReflectionKind.method,
    visibility: ReflectionVisibility,
    name: number | string | symbol;
    parameters: TypeParameter[];
    optional?: true,
    abstract?: true;
    return: Type;
}

export interface TypeProperty extends TypeLiteralMember {
    kind: ReflectionKind.property,
    visibility: ReflectionVisibility,
    name: number | string | symbol;
    optional?: true,
    readonly?: true;
    abstract?: true;
    description?: string;
    type: Type;

    /**
     * Set when the property has a default value aka initializer.
     */
    default?: () => any
}

export interface TypeFunction {
    kind: ReflectionKind.function,
    name?: number | string | symbol,
    parameters: TypeParameter[];
    return: Type;
}

export interface TypePromise {
    kind: ReflectionKind.promise,
    type: Type;
}

export interface TypeClass {
    kind: ReflectionKind.class,
    classType: ClassType;
    /**
     * When class has generic template arguments, e.g. MyClass<string>, it contains
     * all template arguments. If no template arguments are given, its undefined.
     */
    arguments?: Type[];

    /**
     * properties/methods.
     */
    types: Type[];
}

export interface TypeEnum {
    kind: ReflectionKind.enum,
    enum: { [name: string]: string | number | undefined | null },
    values: (string | number | undefined | null)[]
}

export interface TypeEnumMember {
    kind: ReflectionKind.enumMember,
    name: string;
    default?: () => string | number;
}

export interface TypeTemplate {
    kind: ReflectionKind.template,
    name: string,
}

export interface TypeUnion {
    kind: ReflectionKind.union,
    types: Type[];
}

export interface TypeIntersection {
    kind: ReflectionKind.intersection,
    types: Type[];
}

export interface TypeArray {
    kind: ReflectionKind.array,
    type: Type;
}

export interface TypePropertySignature {
    kind: ReflectionKind.propertySignature,
    name: number | string | symbol;
    optional?: true;
    readonly?: true;
    description?: string;
    type: Type;
}

export interface TypeMethodSignature {
    kind: ReflectionKind.methodSignature,
    name: number | string | symbol;
    optional?: true;
    parameters: TypeParameter[];
    return: Type;
}

export interface TypeObjectLiteral {
    kind: ReflectionKind.objectLiteral,
    types: (TypeIndexSignature | TypePropertySignature | TypeMethodSignature)[];
}

export interface TypeIndexSignature {
    kind: ReflectionKind.indexSignature,
    index: Type;
    type: Type;
}

export interface TypeInfer {
    kind: ReflectionKind.infer,

    set(type: Type): void;
}

export interface TypeTupleMember {
    kind: ReflectionKind.tupleMember,
    type: Type;
    optional?: true;
    name?: string;
}

export interface TypeTuple {
    kind: ReflectionKind.tuple,
    types: TypeTupleMember[]
}

export interface TypeRest {
    kind: ReflectionKind.rest,
    type: Type
}

export type Type = TypeNever | TypeAny | TypeVoid | TypeString | TypeNumber | TypeBoolean | TypeBigInt | TypeSymbol | TypeNull | TypeUndefined | TypeLiteral
    | TypeParameter | TypeFunction | TypeMethod | TypeProperty | TypePromise | TypeClass | TypeEnum | TypeEnumMember | TypeUnion | TypeIntersection | TypeArray
    | TypeObjectLiteral | TypeIndexSignature | TypePropertySignature | TypeMethodSignature | TypeTemplate | TypeInfer | TypeTuple | TypeTupleMember
    | TypeRest | TypeRegexp
    ;

export type FindType<T extends Type, LOOKUP extends ReflectionKind> = { [P in keyof T]: T[P] extends LOOKUP ? T : never }[keyof T]

export function isType(entry: any): entry is Type {
    return 'object' === typeof entry && entry.constructor === Object && 'kind' in entry;
}

/**
 * Checks if the structure of a and b are identical.
 */
export function isSameType(a: Type, b: Type): boolean {
    if (a.kind !== b.kind) return false;

    if (a.kind === ReflectionKind.literal) return a.literal === (b as TypeLiteral).literal;
    if (a.kind === ReflectionKind.objectLiteral || a.kind === ReflectionKind.class) {
        //todo: compare structure if equal
        for (const t of a.types) {

        }
    }

    if (a.kind === ReflectionKind.array) {

    }

    if (a.kind === ReflectionKind.tuple) {

    }

    if (a.kind === ReflectionKind.function || a.kind === ReflectionKind.method) {

    }

    if (a.kind === ReflectionKind.union) {

    }

    //todo: this is not at all done.

    return true;
}

export function isTypeIncluded(types: Type[], type: Type): boolean {
    for (const t of types) {
        if (isSameType(t, type)) return true;
    }

    return false;
}

function findMember(
    index: string | number | symbol, type: { types: Type[] }
): TypePropertySignature | TypeMethodSignature | TypeMethod | TypeProperty | TypeIndexSignature | undefined {
    const indexType = typeof index;

    for (const member of type.types) {
        if (member.kind === ReflectionKind.propertySignature && member.name === index) return member;
        if (member.kind === ReflectionKind.methodSignature && member.name === index) return member;
        if (member.kind === ReflectionKind.property && member.name === index) return member;
        if (member.kind === ReflectionKind.method && member.name === index) return member;

        if (member.kind === ReflectionKind.indexSignature) {
            if (member.index.kind === ReflectionKind.string && 'string' === indexType) return member;
            if (member.index.kind === ReflectionKind.number && 'number' === indexType) return member;
            if (member.index.kind === ReflectionKind.symbol && 'symbol' === indexType) return member;
            //todo: union needs to match depending on union and indexType
        }
    }

    return;
}

function resolveObjectIndexType(type: TypeObjectLiteral | TypeClass, index: Type): Type {
    if (index.kind === ReflectionKind.literal && ('string' === typeof index.literal || 'number' === typeof index.literal || 'symbol' === typeof index.literal)) {
        const member = findMember(index.literal, type);
        if (member) {
            if (member.kind === ReflectionKind.indexSignature) {
                //todo: check if index type matches literal type
                return member.type;
            } else if (member.kind === ReflectionKind.method || member.kind === ReflectionKind.methodSignature) {
                return member;
            } else if (member.kind === ReflectionKind.property || member.kind === ReflectionKind.propertySignature) {
                return member.type;
            } else {
                return { kind: ReflectionKind.never };
            }
        } else {
            return { kind: ReflectionKind.any };
        }
    } else {
        return { kind: ReflectionKind.never };
    }
}

/**
 * Query a container type and return the result.
 *
 * container[index]
 *
 * e.g. {a: string}['a'] => string
 * e.g. {a: string, b: number}[keyof T] => string | number
 * e.g. [string, number][0] => string
 * e.g. [string, number][number] => string | number
 */
export function indexAccess(container: Type, index: Type): Type {
    if (container.kind === ReflectionKind.array) {
        if ((index.kind === ReflectionKind.literal && 'number' === typeof index.literal) || index.kind === ReflectionKind.number) return container.type;
    } else if (container.kind === ReflectionKind.tuple) {
        if (index.kind === ReflectionKind.literal && 'number' === typeof index.literal) {
            //todo: this does not yet support `[string, ...number[], boolean][1] => number|boolean`
            const sub = container.types[index.literal];
            if (sub.type.kind === ReflectionKind.rest) {
                return sub.type.type;
            } else {
                return sub.type;
            }
        } else if (index.kind === ReflectionKind.number) {
            const union: TypeUnion = { kind: ReflectionKind.union, types: [] };
            for (const sub of container.types) {
                if (sub.type.kind === ReflectionKind.rest) {
                    if (isTypeIncluded(union.types, sub.type.type)) continue;
                    union.types.push(sub.type.type);
                } else {
                    if (isTypeIncluded(union.types, sub.type)) continue;
                    union.types.push(sub.type);
                }
            }
            return union;
        } else {
            return { kind: ReflectionKind.never };
        }
    } else if (container.kind === ReflectionKind.objectLiteral || container.kind === ReflectionKind.class) {
        if (index.kind === ReflectionKind.literal) {
            return resolveObjectIndexType(container, index);
        } else if (index.kind === ReflectionKind.union) {
            const union: TypeUnion = { kind: ReflectionKind.union, types: [] };
            for (const t of index.types) {
                const result = resolveObjectIndexType(container, t);
                if (result.kind === ReflectionKind.never) continue;

                if (result.kind === ReflectionKind.union) {
                    for (const resultT of result.types) {
                        if (isTypeIncluded(union.types, resultT)) continue;
                        union.types.push(resultT);
                    }
                } else {
                    if (isTypeIncluded(union.types, result)) continue;
                    union.types.push(result);
                }
            }
            return union;
        } else {
            return { kind: ReflectionKind.any };
        }
    }
    return { kind: ReflectionKind.never };
}

export function widenLiteral(type: Type): Type {
    if (type.kind === ReflectionKind.literal) {
        if ('number' === typeof type.literal) return { kind: ReflectionKind.number };
        if ('boolean' === typeof type.literal) return { kind: ReflectionKind.boolean };
        if ('bigint' === typeof type.literal) return { kind: ReflectionKind.bigint };
        if ('symbol' === typeof type.literal) return { kind: ReflectionKind.symbol };
        if ('string' === typeof type.literal) return { kind: ReflectionKind.string };
    }

    return type;
}

function typeInferFromContainer(container: Iterable<any>): Type {
    const union: TypeUnion = { kind: ReflectionKind.union, types: [] };
    for (const item of container) {
        const type = widenLiteral(typeInfer(item));
        if (!isTypeIncluded(union.types, type)) union.types.push(type);
    }

    return union.types.length === 0 ? { kind: ReflectionKind.any } : union.types.length === 1 ? union.types[0] : union;
}

export function typeInfer(value: any): Type {
    if ('string' === typeof value || 'number' === typeof value || 'boolean' === typeof value || 'bigint' === typeof value || 'symbol' === typeof value) {
        return { kind: ReflectionKind.literal, literal: value };
    } else if (null === value) {
        return { kind: ReflectionKind.null };
    } else if (undefined === value) {
        return { kind: ReflectionKind.undefined };
    } else if ('function' === typeof value) {
        if (isArray(value.__type)) {
            //with emitted types
            return resolveRuntimeType(value);
        }

        return { kind: ReflectionKind.function, name: value.name, return: { kind: ReflectionKind.any }, parameters: [] };
    } else if (isArray(value)) {
        return { kind: ReflectionKind.array, type: typeInferFromContainer(value) };
    } else if ('object' === typeof value) {
        const constructor = value.constructor;
        if ('function' === typeof constructor && constructor !== Object && isArray(constructor.__type)) {
            //with emitted types
            return resolveRuntimeType(constructor);
        }

        if (constructor === RegExp) return { kind: ReflectionKind.regexp };
        if (constructor === Date) return { kind: ReflectionKind.class, classType: Date, types: [] };
        if (constructor === Set) {
            const type = typeInferFromContainer(value);
            return { kind: ReflectionKind.class, classType: Set, arguments: [type], types: [] };
        }

        if (constructor === Map) {
            const keyType = typeInferFromContainer((value as Map<any, any>).keys());
            const valueType = typeInferFromContainer((value as Map<any, any>).values());
            return { kind: ReflectionKind.class, classType: Map, arguments: [keyType, valueType], types: [] };
        }

        const type: TypeObjectLiteral = { kind: ReflectionKind.objectLiteral, types: [] };
        for (const i in value) {
            if (!value.hasOwnProperty(i)) continue;
            const propType = typeInfer(value[i]);

            if (propType.kind === ReflectionKind.methodSignature || propType.kind === ReflectionKind.function) {
                type.types.push({
                    kind: ReflectionKind.methodSignature,
                    name: i,
                    return: propType.return,
                    parameters: propType.parameters
                });
                continue;
            }

            const property: TypePropertySignature = { kind: ReflectionKind.propertySignature, name: i, type: { kind: ReflectionKind.any } };

            if (propType.kind === ReflectionKind.literal) {
                property.type = widenLiteral(propType);
            } else {
                property.type = propType;
            }

            type.types.push(property);
        }
        return type;
    }
    return { kind: ReflectionKind.any };
}

export function assertType<K extends Type['kind'], T>(t: Type, kind: K): asserts t is FindType<Type, K> {
    if (t.kind !== kind) throw new Error(`Invalid type ${t.kind}, expected ${kind}`);
}

export function isMember(type: Type): type is TypePropertySignature | TypeProperty | TypeMethodSignature | TypeMethod {
    return type.kind === ReflectionKind.propertySignature || type.kind === ReflectionKind.property
        || type.kind === ReflectionKind.methodSignature || type.kind === ReflectionKind.method;
}

/**
 * Checks whether `undefined` is allowed as type.
 */
export function isOptional(type: Type): boolean {
    if (isMember(type) && type.optional === true) return true;
    if (type.kind === ReflectionKind.property || type.kind === ReflectionKind.propertySignature || type.kind === ReflectionKind.indexSignature) return isOptional(type.type);
    return type.kind === ReflectionKind.undefined || (type.kind === ReflectionKind.union && type.types.some(v => v.kind === ReflectionKind.undefined));
}

/**
 * Checks whether `null` is allowed as type.
 */
export function isNullable(type: Type): boolean {
    return type.kind === ReflectionKind.null || (type.kind === ReflectionKind.union && type.types.some(v => v.kind === ReflectionKind.null));
}

/**
 * Integer
 */
export type integer = number;

/**
 * Integer 8 bit.
 * Min value -127, max value 128
 */
export type int8 = number;

/**
 * Unsigned integer 8 bit.
 * Min value 0, max value 255
 */
export type uint8 = number;

/**
 * Integer 16 bit.
 * Min value 0, max value 65535
 */
export type int16 = number;

/**
 * Unsigned integer 16 bit.
 * Min value -32768, max value 32767
 */
export type uint16 = number;

/**
 * Integer 8 bit.
 * Min value -2147483648, max value 2147483647
 */
export type int32 = number;

/**
 * Unsigned integer 32 bit.
 * Min value 0, max value 4294967295
 */
export type uint32 = number;

/**
 * Float (same as number, but different semantic for databases).
 */
export type float = number;

/**
 * Float 32 bit.
 */
export type float32 = number;

/**
 * Float 64 bit.
 */
export type float64 = number;

export type Reference = { __meta?: 'reference' };
export type PrimaryKey = { __meta?: 'primaryKey' };
export type AutoIncrement = { __meta?: 'autoIncrement' };
export type UUID = string & { __meta?: 'UUIDv4' };
export type MongoId = string & { __meta?: 'mongoId' };
export type BackReference<VIA extends ClassType | Object = never> = { __meta?: 'backReference', backReference?: { via: VIA } };

export const enum MappedModifier {
    optional = 1 << 0,
    removeOptional = 1 << 1,
    readonly = 1 << 2,
    removeReadonly = 1 << 3,
}

export function stringifyType(type: Type, depth: number = 0): string {
    switch (type.kind) {
        case ReflectionKind.never:
            return `never`;
        case ReflectionKind.any:
            return `any`;
        case ReflectionKind.void:
            return `void`;
        case ReflectionKind.undefined:
            return `undefined`;
        case ReflectionKind.null:
            return `null`;
        case ReflectionKind.string:
            return 'string';
        case ReflectionKind.number:
            return 'number';
        case ReflectionKind.bigint:
            return 'bigint';
        case ReflectionKind.regexp:
            return 'RegExp';
        case ReflectionKind.boolean:
            return 'boolean';
        case ReflectionKind.literal:
            if ('number' === typeof type.literal) return type.literal + '';
            if ('boolean' === typeof type.literal) return type.literal + '';
            return `'${String(type.literal).replace(/'/g, '\\\'')}'`;
        case ReflectionKind.promise:
            return `Promise<${stringifyType(type.type)}>`;
        case ReflectionKind.class: {
            if (type.classType === Date) return `Date`;
            if (type.classType === Set) return `Set<${stringifyType(type.arguments![0])}>`;
            if (type.classType === Map) return `Map<${stringifyType(type.arguments![0])}, ${stringifyType(type.arguments![1])}>`;
            const indentation = indent((depth + 1) * 2);
            const args = type.arguments ? '<' + type.arguments.map(stringifyType).join(', ') + '>' : '';
            return `${getClassName(type.classType)}${args} {\n${type.types.map(v => indentation(stringifyType(v, depth + 1))).join(';\n')};\n}`;
        }
        case ReflectionKind.objectLiteral: {
            const indentation = indent((depth + 1) * 2);
            return `{\n${type.types.map(v => indentation(stringifyType(v, depth + 1))).join(';\n')};\n}`;
        }
        case ReflectionKind.union:
            return type.types.map(stringifyType).join(' | ');
        case ReflectionKind.intersection:
            return type.types.map(stringifyType).join(' & ');
        case ReflectionKind.parameter: {
            const visibility = type.visibility ? ReflectionVisibility[type.visibility] + ' ' : '';
            return `${type.readonly ? 'readonly ' : ''}${visibility}${type.name}${type.optional ? '?' : ''}: ${stringifyType(type.type)}`;
        }
        case ReflectionKind.function:
            return `(${type.parameters.map(stringifyType).join(', ')}) => ${stringifyType(type.return)}`;
        case ReflectionKind.enum:
            return `enum todo`;
        case ReflectionKind.array:
            return `${stringifyType(type.type)}[]`;
        case ReflectionKind.rest:
            return `...${stringifyType(type.type)}[]`;
        case ReflectionKind.tupleMember:
            if (type.name) return `${type.name}${type.optional ? '?' : ''}: ${stringifyType(type.type)}`;
            return `${stringifyType(type.type)}${type.optional ? '?' : ''}`;
        case ReflectionKind.tuple:
            return `[${type.types.map(stringifyType).join(', ')}]`;
        case ReflectionKind.indexSignature:
            return `{[index: ${stringifyType(type.index)}]: ${stringifyType(type.type)}`;
        case ReflectionKind.propertySignature:
            return `${type.readonly ? 'readonly ' : ''}${String(type.name)}${type.optional ? '?' : ''}: ${stringifyType(type.type)}`;
        case ReflectionKind.property: {
            const visibility = type.visibility ? ReflectionVisibility[type.visibility] + ' ' : '';
            return `${type.readonly ? 'readonly ' : ''}${visibility}${String(type.name)}${type.optional ? '?' : ''}: ${stringifyType(type.type)}`;
        }
        case ReflectionKind.methodSignature:
            return `${String(type.name)}${type.optional ? '?' : ''}(${type.parameters.map(stringifyType).join(', ')}): ${stringifyType(type.return)}`;
        case ReflectionKind.method: {
            const visibility = type.visibility ? ReflectionVisibility[type.visibility] + ' ' : '';
            return `${type.abstract ? 'abstract ' : ''}${visibility}${String(type.name)}${type.optional ? '?' : ''}(${type.parameters.map(stringifyType).join(', ')}): ${stringifyType(type.return)}`;
        }
    }

    return type.kind + '';
}

/**
 * The instruction set.
 * Should not be greater than 93 members, because we encode it via charCode starting at 33. +93 means we end up with charCode=126
 * (which is '~' and the last char that can be represented without \x. The next 127 is '\x7F').
 */
export enum ReflectionOp {
    never,
    any,
    void,

    string,
    number,
    numberBrand,
    boolean,
    bigint,

    symbol,
    null,
    undefined,

    /**
     * The literal type of string, number, or boolean.
     *
     * This OP has 1 parameter. The next byte is the absolute address of the literal on the stack, which is the actual literal value.
     *
     * Pushes a function type.
     */
    literal,

    /**
     * This OP pops all types on the current stack frame.
     *
     * This OP has 1 parameter. The next byte is the absolute address of a string|number|symbol entry on the stack.
     *
     * Pushes a function type.
     */
    function,

    /**
     * This OP pops all types on the current stack frame.
     *
     * Pushes a method type.
     */
    method,
    methodSignature, //has 1 parameter, reference to stack for its property name

    parameter,

    /**
     * This OP pops the latest type entry on the stack.
     *
     * Pushes a property type.
     */
    property,
    propertySignature, //has 1 parameter, reference to stack for its property name

    constructor,

    /**
     * This OP pops all types on the current stack frame. Those types should be method|property.
     *
     * Pushes a class type.
     */
    class,

    /**
     * This OP has 1 parameter, the stack entry to the actual class symbol.
     */
    classReference,

    /**
     * Marks the last entry in the stack as optional. Used for method|property. Equal to the QuestionMark operator in a property assignment.
     */
    optional,
    readonly,

    //modifiers for property|method
    public,
    private,
    protected,
    abstract,
    defaultValue,
    description,
    rest,

    regexp,

    enum,
    enumMember, //has one argument, the name.

    set,
    map,

    /**
     * Pops the latest stack entry and uses it as T for an array type.
     *
     * Pushes an array type.
     */
    array,
    tuple,
    tupleMember,
    namedTupleMember, //has one argument, the name.

    union, //pops frame. requires frame start when stack can be dirty.
    intersection,

    indexSignature,
    objectLiteral,
    mappedType, //2 parameters: functionPointer and modifier.
    in,

    frame, //creates a new stack frame
    return,

    //special instructions that exist to emit less output
    date,
    int8Array,
    uint8ClampedArray,
    uint8Array,
    int16Array,
    uint16Array,
    int32Array,
    uint32Array,
    float32Array,
    float64Array,
    bigInt64Array,
    arrayBuffer,
    promise,

    // pointer, //parameter is a number referencing an entry in the stack, relative to the very beginning (0). pushes that entry onto the stack.
    arg, //@deprecated. parameter is a number referencing an entry in the stack, relative to the beginning of the current frame, *-1. pushes that entry onto the stack. this is related to the calling convention.
    template, //template argument, e.g. T in a generic. has 1 parameter: reference to the name.
    templateDefault, //template argument with a default value, e.g. T in a generic. has 1 parameter: reference to the name. pop() for the default value
    var, //reserve a new variable in the stack
    loads, //pushes to the stack a referenced value in the stack. has 2 parameters: <frame> <index>, frame is a negative offset to the frame, and index the index of the stack entry withing the referenced frame

    indexAccess, //T['string'], 2 items on the stack
    keyof, //keyof operator
    infer, //2 params, like `loads`
    typeof, //1 parameter that points to a function returning the runtime value from which we need to extract the type

    condition,
    jumpCondition, //used when INFER is used in `extends` conditional branch. 2 args: left program, right program
    jump, //jump to an address
    call, //has one parameter, the next program address. creates a new stack frame with current program address as first stack entry, and jumps back to that + 1.
    inline,
    inlineCall,


    extends, //X extends Y, XY popped from the stack, pushes boolean on the stack
}
