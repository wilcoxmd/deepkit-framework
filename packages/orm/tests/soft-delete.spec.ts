import { plainToClass, t } from '@deepkit/type';
import { test } from '@jest/globals';
import { Database } from '../src/database';
import { MemoryDatabaseAdapter } from '../src/memory-db';
import { SoftDelete, SoftDeleteQuery } from '../src/plugin/soft-delete';

test('soft-delete', async () => {
    const s = t.schema({
        id: t.number.autoIncrement.primary,
        username: t.string,
        deletedAt: t.date.optional
    }, {name: 'User'});

    const memory = new MemoryDatabaseAdapter();
    const database = new Database(memory);
    const softDelete = new SoftDelete(database);
    const store = memory.getStore(s);
    softDelete.enable(s);

    await database.persist(plainToClass(s, {id: 1, username: 'Peter'}));
    await database.persist(plainToClass(s, {id: 2, username: 'Joe'}));
    await database.persist(plainToClass(s, {id: 3, username: 'Lizz'}));

    expect(await database.query(s).count()).toBe(3);
    expect(store.items.size).toBe(3);
    
    await database.query(s).filter({id: 1}).deleteOne();

    expect(store.items.size).toBe(3);
    expect((store.items.get(1) as any).deletedAt).toBeInstanceOf(Date);
    expect(await database.query(s).count()).toBe(2);

    await database.query(s).filter({id: 2}).deleteOne();

    expect(store.items.size).toBe(3);
    expect((store.items.get(2) as any).deletedAt).toBeInstanceOf(Date);
    expect(await database.query(s).count()).toBe(1);

    await SoftDeleteQuery.create(database.query(s).filter({id: 1})).restoreOne();

    expect(store.items.size).toBe(3);
    expect((store.items.get(1) as any).deletedAt).toBe(undefined);
    expect(await database.query(s).count()).toBe(2);

    await SoftDeleteQuery.create(database.query(s)).restoreMany();
    expect(store.items.size).toBe(3);
    expect((store.items.get(2) as any).deletedAt).toBe(undefined);
    expect(await database.query(s).count()).toBe(3);

    await database.query(s).deleteMany();
    expect(store.items.size).toBe(3);
    expect(await database.query(s).count()).toBe(0);

    await SoftDeleteQuery.create(database.query(s)).withSoftDeleted().deleteMany();
    expect(store.items.size).toBe(0);
    expect(await database.query(s).count()).toBe(0);
});
