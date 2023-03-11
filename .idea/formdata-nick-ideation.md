# Input & Output Strategies & Content-Type

So this is a super vague idea, and having looked through how we handle requests, and knowing the limitations of a TS client proxy, might be either a big refactor or simply not work.

## Input & Output Strategies

Currently we have an input parser type like this:

```ts
export type Parser = ParserWithoutInput<any> | ParserWithInputOutput<any, any>;
```

I'm imagine we build on this with a `DataStrategy` base-class. All of the aspects of `resolveHTTPResponse.ts` (and other parts of the invocation pipeline) which are coupled to JSON could be lifted up into the DataStrategy config. The first thing that could be done is the procedure is selected, then the DataStrategy can be used to handle the inputs as configured. Right now it's looking pretty tied to JSON data but it seems possible.

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
  // implement methods for streams
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

It would probably mean having to disable batching client-side for any procedures taking a non-json input/output but that's expected anyway I imagine?

## Client Side

Client side I imagine has problems with varying the content-type due to the proxy not actually knowing anything at run-time, so we could enforce via typescript that an option is enabled, or write some dedicated hooks for the scenario?

```ts
// Maybe use the proxy to forcible vary some alternative query/mutation methods?
trpc.someProcedure.useFileQuery()
trpc.someProcedure.useFormDataMutation()
```
