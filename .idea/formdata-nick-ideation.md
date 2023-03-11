# Input & Output Strategies & Content-Type

So this is a super vague idea, and having looked through how we handle requests, and knowing the limitations of a TS client proxy, might be either a big refactor or simply not work.

## Input & Output Strategies

Currently we have an input parser type like this:

```ts
export type Parser = ParserWithoutInput<any> | ParserWithInputOutput<any, any>;
```

I propose we build on this with a `DataStrategy` base-class

```ts
// 
// @internal

abstract class DataStrategy<TO> {
  abstract parse(data: unknown): TO

  // Probably mime-types but 
  abstract getContentType(): 'json' | 'multipartform' | 'octet-stream'
}

class JsonDataStrategy<TO> extends DataStrategy<TO> {
  // implement methods to support all existing functionality - zod schemas, etc
}

export class FormDataStrategy extends DataStrategy<FormData> {
  // implement methods for forms
}

export class OctetStreamStrategy extends DataStrategy<Stream> {
  // implement methods for forms
}

export type Parser = ParserWithoutInput<any> | ParserWithInputOutput<any, any> | DataStrategy<any>;

// 
// someRouter.ts

// we keep it backwards compatible, constructing a JsonDataStrategy for any non-`instanceof DataStrategy`
baseProcedure.input(zodType)

// we expose the new strategies to users
baseProcedure
  .input(FormDataStrategy.create({ /* options like expected keys maybe? */ }))
  .mutation(({ input: FormData }) => {
    // Let the user wrangle this however they like, typesafety could be enhanced by the Strategy if possible
    input.get("someField")
    input.get("file")
  })
baseProcedure
  .input(OctetStreamStrategy.create({ /* options like maxSize maybe? */ }))
  .mutation(({ input: Stream }) => {
    // Let the user wrangle the stream however they like
    input.pipe(s3StoragePipe)
  })
```

This could be applied on both .input and .output, where .input varies the content-type of a request, and .output varies the content-type of a response. 

## Client Side

```ts
// Maybe use the proxy to forcible vary some alternative query/mutation methods?
trpc.someProcedure.useFileQuery()
trpc.someProcedure.useFormDataMutation()
```
