import { ZodType, EnumLike, z } from 'zod';

type NameTransformFn = (name: string | undefined, path: string) => string;
type FormatterOptions = {
    title: string;
    transformName?: NameTransformFn;
};

declare function formatModelsAsMarkdown(models: NamedModel[], options: FormatterOptions): string;

type LoaderOptions = {
    entry: string | string[];
    tsconfig?: string;
    format?: 'esm' | 'cjs';
};

declare function loadZodSchemas(options: LoaderOptions): Promise<ExportedSchema[]>;

type Options = LoaderOptions & FormatterOptions;
type Config = Options & {
    output: string;
};
type ExportedSchema = {
    name?: string;
    schema: ZodType<unknown>;
    path: string;
};
type NamedModel = Model & Ref;
type Model = (ArrayModel | ObjectModel | StringModel | NumberModel | BooleanModel | DateModel | EnumModel | NativeEnumModel | UnionModel | IntersectionModel | RecordModel | TupleModel | FunctionModel | PromiseModel | LiteralModel | NullModel | UndefinedModel | SymbolModel | BigIntModel | UnknownModel | AnyModel | VoidModel | NeverModel) & ModelMeta;
type Ref = {
    name?: string;
    path: string;
} & ModelMeta;
type ModelMeta = {
    description?: string;
    default?: unknown;
    optional?: boolean;
    nullable?: boolean;
    readonly?: boolean;
};
type ModelOrRef = {
    kind: 'model';
    model: Model;
} | {
    kind: 'ref';
    ref: Ref;
};
type ArrayModel = {
    type: 'array';
    items: ModelOrRef;
    validations?: ArrayValidation[];
};
type ObjectModel = {
    type: 'object';
    fields: ({
        key: string;
        required: boolean;
    } & ModelOrRef)[];
};
type StringModel = {
    type: 'string';
    validations?: StringValidation[];
};
type NumberModel = {
    type: 'number';
    validations?: NumberValidation[];
};
type BooleanModel = {
    type: 'boolean';
};
type DateModel = {
    type: 'date';
};
type EnumModel = {
    type: 'enum';
    values: string[];
};
type NativeEnumModel = {
    type: 'native-enum';
    enum: EnumLike;
};
type UnionModel = {
    type: 'union';
    options: ModelOrRef[];
};
type IntersectionModel = {
    type: 'intersection';
    parts: [ModelOrRef, ModelOrRef];
};
type RecordModel = {
    type: 'record';
    keys: ModelOrRef;
    values: ModelOrRef;
};
type TupleModel = {
    type: 'tuple';
    items: ModelOrRef[];
    rest?: ModelOrRef;
};
type FunctionModel = {
    type: 'function';
    parameters: ModelOrRef[];
    returnValue: ModelOrRef;
};
type PromiseModel = {
    type: 'promise';
    resolvedValue: ModelOrRef;
};
type LiteralModel = {
    type: 'literal';
    value: z.Primitive;
};
type NullModel = {
    type: 'null';
};
type UndefinedModel = {
    type: 'undefined';
};
type SymbolModel = {
    type: 'symbol';
};
type BigIntModel = {
    type: 'bigint';
    validations?: BigIntValidation[];
};
type UnknownModel = {
    type: 'unknown';
};
type AnyModel = {
    type: 'any';
};
type VoidModel = {
    type: 'void';
};
type NeverModel = {
    type: 'never';
};
type ArrayValidation = ['min', number] | ['max', number] | ['length', number];
type StringValidation = ['min', number] | ['max', number] | ['length', number] | 'email' | 'url' | 'emoji' | 'uuid' | 'cuid' | 'cuid2' | 'ulid' | ['regex', RegExp] | ['includes', string] | ['startsWith', string] | ['endsWith', string] | ['datetime', {
    offset: boolean;
    precision: number | null;
}] | ['ip', {
    version?: 'v4' | 'v6';
}];
type NumberValidation = ['gt', number] | ['gte', number] | ['lt', number] | ['lte', number] | 'int' | ['multipleOf', number] | 'finite' | 'safe';
type BigIntValidation = ['gt', bigint] | ['gte', bigint] | ['lt', bigint] | ['lte', bigint] | ['multipleOf', bigint];

declare function convertSchemas(exportedSchemas: ExportedSchema[]): NamedModel[];

declare function zod2md(options: Options): Promise<string>;

export { type Config, type Options, convertSchemas, formatModelsAsMarkdown, loadZodSchemas, zod2md };
