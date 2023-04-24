import { waitError } from '../___testHelpers';
import { getServerAndReactClient } from '../react/__reactHelpers';
import { render, waitFor } from '@testing-library/react';
import { initTRPC } from '@trpc/server';
import { konn } from 'konn';
import React from 'react';
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

    return getServerAndReactClient(appRouter);
  })
  .afterEach(async (ctx) => {
    await ctx?.close?.();
  })
  .done();

test('batch query', async () => {
  const res = await ctx.proxyClient.hello.query('world', {});
  expect(res).toBe('hello world');
});

test('single query', async () => {
  const res = await ctx.proxyClient.hello.query('world', {
    context: {
      skipBatch: true,
    },
  });
  expect(res).toBe('hello world');
});
test('single mutation', async () => {
  const res = await ctx.proxyClient.doSomething.mutate('something', {
    context: {
      skipBatch: true,
    },
  });
  expect(res).toBe('did something');
});

test('batch mutation', async () => {
  const res = await ctx.proxyClient.doSomething.mutate('something', {});
  expect(res).toBe('did something');
});

test('React mutate', async () => {
  function MyComponent() {
    const mutation = ctx.proxy.doSomething.useMutation({
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    });

    return (
      <>
        <button
          data-testid="mutate"
          onClick={() => {
            mutation.mutate('something');
          }}
        />
        {mutation.data && <div data-testid="result">{mutation.data}</div>}
      </>
    );
  }

  const utils = render(
    <ctx.App>
      <MyComponent />
    </ctx.App>,
  );

  const mutateButton = await utils.findByTestId('mutate');
  mutateButton.click();

  await waitFor(() => {
    expect(utils.getByTestId('result')).toHaveTextContent('did something');
  });
});
