import 'reflect-metadata';
import { entity, getClassSchema, getGlobalStore, PropertySchema, t } from '@deepkit/type';
import { expect, test } from '@jest/globals';
import { DirectClient } from '../src/client/client-direct';
import { getActions, rpc } from '../src/decorators';
import { RpcKernel, RpcKernelConnection } from '../src/server/kernel';
import { injectable } from '@deepkit/injector';
import { Session, SessionState } from '../src/server/security';
import { BehaviorSubject } from 'rxjs';
import { getBSONSerializer } from '../../bson';
import { getBSONDecoder } from '@deepkit/bson';
import { getClassName } from '@deepkit/core';

test('decorator', async () => {
    @rpc.controller('name')
    class Controller {
        @rpc.action()
        action(): void {
        }

        @rpc.action().group('a')
        second(): void {
        }
    }

    {
        const actions = getActions(Controller);
        expect(actions.size).toBe(2);
        expect(actions.get('action')!.name).toBe('action');
        expect(actions.get('action')!.groups).toEqual([]);
        expect(actions.get('second')!.name).toBe('second');
        expect(actions.get('second')!.groups).toEqual(['a']);
    }
});

test('inheritance', async () => {
    class User {}

    @rpc.controller('name')
    class Controller {
        @rpc.action()
        @t.type(User).optional
        action(): User | undefined {
            return new User();
        }

        @rpc.action().group('a')
        second(): User {
            return new User();
        }
    }

    @rpc.controller('different')
    class Extended extends Controller {
        @rpc.action().group('extended')
        second() {
            return super.second();
        }

        @rpc.action().group('b')
        third(): void {
        }
    }

    {
        const actions = getActions(Controller);
        expect(actions.size).toBe(2);
        expect(actions.get('action')!.name).toBe('action');
        expect(actions.get('action')!.groups).toEqual([]);
        expect(actions.get('second')!.name).toBe('second');
        expect(actions.get('second')!.groups).toEqual(['a']);

        const resultProperty = getClassSchema(Controller).getMethod('action');
        expect(resultProperty.type).toBe('class');
        expect(resultProperty.classType).toBe(User);
    }

    {
        const actions = getActions(Extended);
        expect(actions.size).toBe(3);
        expect(actions.get('action')!.name).toBe('action');
        expect(actions.get('action')!.groups).toEqual([]);

        expect(actions.get('second')!.name).toBe('second');
        expect(actions.get('second')!.groups).toEqual(['a', 'extended']);

        expect(actions.get('third')!.name).toBe('third');
        expect(actions.get('third')!.groups).toEqual(['b']);

        const resultProperty = getClassSchema(Extended).getMethod('action');
        expect(resultProperty.type).toBe('class');
        expect(resultProperty.classType).toBe(User);
    }
});

test('basics', async () => {
    @entity.name('model/basics')
    class MyModel {
        constructor(
            @t public name: string
        ) {
        }
    }

    @entity.name('MyError')
    class MyError extends Error {
    }

    @entity.name('MyError2')
    class MyError2 extends Error {
        constructor(
            @t public id: number
        ) {
            super('critical');
        }
    }

    class Controller {
        @rpc.action()
        createModel(value: string): MyModel {
            return new MyModel(value);
        }

        @rpc.action()
        notDefined(): (string | number)[] {
            return [123, 'bar'];
        }

        @rpc.action()
        union(): (string | number) {
            return 213;
        }

        @rpc.action()
        throws(): void {
            throw new Error('Great');
        }

        @rpc.action()
        myError(): void {
            throw new MyError('Mhpf');
        }

        @rpc.action()
        myError2(): void {
            throw new MyError2(99);
        }
    }

    const kernel = new RpcKernel();
    kernel.registerController('myController', Controller);

    const client = new DirectClient(kernel);
    const controller = client.controller<Controller>('myController');

    {
        const m = await controller.createModel('foo');
        expect(m).toBeInstanceOf(MyModel);
        expect(m.name).toBe('foo');
    }

    {
        const m = await controller.notDefined();
        expect(m).toEqual([123, 'bar']);
    }

    {
        const m = await controller.union();
        expect(m).toBe(213);
    }

    {
        await expect(controller.throws()).rejects.toThrowError(Error as any);
        await expect(controller.throws()).rejects.toThrowError('Great');
    }

    {
        await expect(controller.myError()).rejects.toThrowError(MyError as any);
        await expect(controller.myError()).rejects.toThrowError('Mhpf');
    }

    {
        await expect(controller.myError2()).rejects.toThrowError(MyError2 as any);
        await expect(controller.myError2()).rejects.toThrowError('critical');
        await expect(controller.myError2()).rejects.toMatchObject({ id: 99 });
    }
});

test('promise', async () => {
    @entity.name('model/promise')
    class MyModel {
        constructor(
            @t public name: string
        ) {
        }
    }

    class Controller {
        @rpc.action()
        //MyModel is automatically detected once executed.
        async createModel(value: string): Promise<MyModel> {
            return new MyModel(value);
        }

        @rpc.action()
        @t.type(MyModel)
        async createModel2(value: string): Promise<MyModel> {
            return new MyModel(value);
        }

        @rpc.action()
        @t.generic(MyModel)
        async createModel3(value: string): Promise<MyModel> {
            return new MyModel(value);
        }

        @rpc.action()
        async createModel4(value: string): Promise<BehaviorSubject<MyModel>> {
            return new BehaviorSubject<MyModel>(new MyModel(value));
        }
    }

    const kernel = new RpcKernel();
    kernel.registerController('myController', Controller);

    const client = new DirectClient(kernel);
    const controller = client.controller<Controller>('myController');

    {
        const model = await controller.createModel('foo');
        expect(model).toBeInstanceOf(MyModel);
    }

    {
        const model = await controller.createModel('foo');
        expect(model).toBeInstanceOf(MyModel);
    }

    {
        const model = await controller.createModel2('foo');
        expect(model).toBeInstanceOf(MyModel);
    }

    {
        const model = await controller.createModel3('foo');
        expect(model).toBeInstanceOf(MyModel);
    }

    {
        const value = await controller.createModel4('foo');
        expect(value).toBeInstanceOf(BehaviorSubject);
        expect(value.value).toBeInstanceOf(MyModel);
    }
});

test('wrong arguments', async () => {
    @entity.name('model/promise2')
    class MyModel {
        constructor(
            @t public id: number
        ) {
        }
    }

    class Controller {
        @rpc.action()
        //MyModel is automatically detected once executed.
        async getProduct(id: number): Promise<MyModel> {
            return new MyModel(id);
        }
    }

    expect(getClassSchema(Controller).getMethodProperties('getProduct')[0].isOptional).toBe(false);
    expect(getClassSchema(Controller).getMethodProperties('getProduct')[0].isNullable).toBe(false);

    const kernel = new RpcKernel();
    kernel.registerController('myController', Controller);

    const client = new DirectClient(kernel);
    const controller = client.controller<Controller>('myController');

    {
        await expect(controller.getProduct(undefined as any)).rejects.toThrow('id(required): Required value is undefined');
    }

    {
        await expect(controller.getProduct('23' as any)).rejects.toThrow('id(required): Required value is undefined');
    }

    {
        await expect(controller.getProduct(NaN as any)).rejects.toThrow('id(invalid_number): No valid number given, got NaN');
    }
});

test('di', async () => {
    @injectable
    class Controller {
        constructor(protected connection: RpcKernelConnection, protected sessionState: SessionState) {
        }

        @rpc.action()
        hasSession(): boolean {
            return this.sessionState.getSession() instanceof Session;
        }

        @rpc.action()
        hasConnection(): boolean {
            return this.connection instanceof RpcKernelConnection;
        }
    }

    const kernel = new RpcKernel();
    kernel.registerController('test', Controller);

    const client = new DirectClient(kernel);
    const controller = client.controller<Controller>('test');

    expect(await controller.hasConnection()).toBe(true);
    expect(await controller.hasSession()).toBe(true);
});

test('connect disconnect', async () => {
    @injectable
    class Controller {
        constructor(protected connection: RpcKernelConnection) {

        }

        @rpc.action()
        test(): void {
        }

        @rpc.action()
        bye(): void {
            this.connection.close();
        }
    }

    const kernel = new RpcKernel();
    kernel.registerController('myController', Controller);

    const client = new DirectClient(kernel);
    const controller = client.controller<Controller>('myController');

    let triggered = 0;
    client.transporter.disconnected.subscribe(() => triggered++);

    expect(client.transporter.isConnected()).toBe(false);
    await client.connect();
    expect(client.transporter.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.transporter.isConnected()).toBe(false);
    expect(triggered).toBe(1);

    await controller.test();
    expect(client.transporter.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.transporter.isConnected()).toBe(false);
    expect(triggered).toBe(2);

    await controller.test();
    expect(client.transporter.isConnected()).toBe(true);
    await controller.bye();
    expect(client.transporter.isConnected()).toBe(false);
    expect(triggered).toBe(3);

    await controller.test();
    expect(client.transporter.isConnected()).toBe(true);
});


test('types', async () => {
    @entity.name('types/model')
    class Model {

    }

    @injectable
    class Controller {
        @rpc.action()
        @t.type({ total: t.number, items: t.array(Model) })
        test(): { total: number, items: Model[] } {
            return { total: 5, items: [new Model] };
        }
    }

    const kernel = new RpcKernel();
    kernel.registerController('myController', Controller);

    const client = new DirectClient(kernel);
    const controller = client.controller<Controller>('myController');

    {
        const res = await controller.test();
        expect(res.total).toBe(5);
        expect(res.items.length).toBe(1);
        expect(res.items[0]).toBeInstanceOf(Model);
    }
});


test('disable type reuse', async () => {
    //per default its tried to reuse models that have an entity name set. with disableTypeReuse this can be disabled

    @entity.name('type/reuse')
    class Model {
        @t child?: Model;

        constructor(@t public title: string) {
        }
    }

    delete getGlobalStore().RegisteredEntities['type/reuse'];

    const schema = getClassSchema(Model);
    expect(schema.getProperty('child').type).toBe('class');
    expect(schema.getProperty('child').getResolvedClassType()).toBe(Model);

    const c = class {};
    Object.defineProperty(c, 'name', {value: 'Model'});
    expect(getClassName(c)).toBe('Model');
    expect(getClassName(new c)).toBe('Model');


    const props = schema.getProperty('child').toJSONNonReference(undefined, true);
    const property = PropertySchema.fromJSON(props, undefined, false);
    const schema2 = property.getResolvedClassSchema();
    expect(getClassName(schema2.classType)).toBe('Model');
    expect(getClassName(new schema2.classType)).toBe('Model');

    expect(schema2.getClassName()).toBe('Model');
    const encoder = getBSONSerializer(schema2);
    const decoder = getBSONDecoder(schema2);
    const bson = encoder({title: 'asd'});
    const back = decoder(bson);
    expect(back).toEqual({title: 'asd'});
    expect(getClassName(back)).toBe('Model');

    @injectable
    class Controller {
        @rpc.action()
        test(): Model {
            return new Model('123');
        }

        @rpc.action()
        @t.type({ total: t.number, items: t.array(Model) })
        testDeep(): { total: number, items: Model[] } {
            return { total: 5, items: [new Model('123')] };
        }
    }

    const kernel = new RpcKernel();
    kernel.registerController('myController', Controller);

    const client = new DirectClient(kernel);
    client.disableTypeReuse();
    const controller = client.controller<Controller>('myController');

    {
        const res = await controller.test();
        expect(res).not.toBeInstanceOf(Model);
        expect(res).toEqual({title: '123'});
        expect(getClassName(res)).toBe('Model');
    }

    {
        const res = await controller.testDeep();
        expect(res.items[0]).not.toBeInstanceOf(Model);
        expect(res.items[0]).toEqual({title: '123'});
    }
});
