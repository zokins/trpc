import { routerToServerAndClientNew, waitError } from '../___testHelpers';
import { httpBatchLink, httpLink, splitLink } from '@trpc/client';
import { initTRPC } from '@trpc/server';
import { konn } from 'konn';
import { z } from 'zod';

const ctx = konn()
  .beforeEach(() => {
    const t = initTRPC.create();
    const appRouter = t.router({
      hello: t.procedure.input(z.string()).query((opts) => {
        return `hello ${opts.input}` as const;
      }),
      doSomething: t.procedure.input(z.string()).mutation((opts) => {
        return `did ${opts.input}` as const;
      }),
    });

    return routerToServerAndClientNew(appRouter, {
      client({ httpUrl }) {
        return {
          links: [
            splitLink({
              condition: (op) => op.context.skipBatch === true,
              true: httpLink({ url: httpUrl }),
              false: httpBatchLink({ url: httpUrl }),
            }),
          ],
        };
      },
      server: {
        batching: {
          enabled: false,
        },
      },
    });
  })
  .afterEach(async (ctx) => {
    await ctx?.close?.();
  })
  .done();

test('batch query', async () => {
  const res = await waitError(ctx.proxy.hello.query('world'));
  expect(res).toMatchInlineSnapshot(
    '[TRPCClientError: Batching is not enabled on the server]',
  );
});

test('single query', async () => {
  const res = await ctx.proxy.hello.query('world', {
    context: {
      skipBatch: true,
    },
  });
  expect(res).toBe('hello world');
});

test('batch mutation', async () => {
  const res = await waitError(ctx.proxy.doSomething.mutate('something'));
  expect(res).toMatchInlineSnapshot(
    '[TRPCClientError: Batching is not enabled on the server]',
  );
});

test('single mutation', async () => {
  const res = await ctx.proxy.doSomething.mutate('something', {
    context: {
      skipBatch: true,
    },
  });
  expect(res).toBe('did something');
});
