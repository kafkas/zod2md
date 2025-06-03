#!/usr/bin/env node
"use strict";

// src/converter/convert-schemas.ts
var import_zod = require("zod");
function convertSchemas(exportedSchemas) {
  return exportedSchemas.map(({ name: name2, path, schema }) => ({
    name: name2,
    path,
    ...convertSchema(schema, exportedSchemas),
    ...schemaToMeta(schema)
  }));
}
function createModelOrRef(schema, exportedSchemas, implicitOptional) {
  const exportedSchema = exportedSchemas.find(
    (exp) => isSameSchema(schema, exp.schema)
  );
  if (exportedSchema) {
    const { schema: _, ...ref } = exportedSchema;
    return {
      kind: "ref",
      ref: {
        ...ref,
        ...schemaToMeta(schema, implicitOptional)
      }
    };
  }
  return {
    kind: "model",
    model: {
      ...convertSchema(schema, exportedSchemas),
      ...schemaToMeta(schema, implicitOptional)
    }
  };
}
function isSameSchema(currSchema, namedSchema) {
  const currSchemaUnwrapped = "innerType" in currSchema._def ? currSchema._def.innerType : null;
  const isOnlyDescriptionChanged = (schema) => Object.keys(namedSchema._def).every(
    (key) => namedSchema._def[key] === schema._def[key]
  ) && schema.description !== namedSchema.description && Object.keys(schema._def).filter((key) => key !== "description").map((key) => namedSchema._def[key] === schema._def[key]);
  return currSchema === namedSchema || currSchemaUnwrapped === namedSchema || isOnlyDescriptionChanged(currSchema) || currSchemaUnwrapped != null && isOnlyDescriptionChanged(currSchemaUnwrapped);
}
function schemaToMeta(schema, implicitOptional) {
  const safeCheck = (is) => {
    try {
      return is();
    } catch {
      return false;
    }
  };
  return {
    ...schema.description && { description: schema.description },
    ...!implicitOptional && safeCheck(schema.isOptional) && { optional: true },
    ...safeCheck(schema.isNullable) && { nullable: true }
  };
}
function convertSchema(schema, exportedSchemas) {
  if (schema instanceof import_zod.ZodOptional) {
    return convertSchema(schema._def.innerType, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodNullable) {
    return convertSchema(schema._def.innerType, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodDefault) {
    return {
      ...convertSchema(schema._def.innerType, exportedSchemas),
      default: schema._def.defaultValue()
    };
  }
  if (schema instanceof import_zod.ZodReadonly) {
    return {
      ...convertSchema(schema._def.innerType, exportedSchemas),
      readonly: true
    };
  }
  if (schema instanceof import_zod.ZodEffects) {
    return convertSchema(schema._def.schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodCatch) {
    return convertSchema(schema._def.innerType, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodBranded) {
    return convertSchema(schema._def.type, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodLazy) {
    return convertSchema(schema._def.getter(), exportedSchemas);
  }
  if (schema instanceof import_zod.ZodArray) {
    return convertZodArray(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodObject) {
    return convertZodObject(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodString) {
    return convertZodString(schema);
  }
  if (schema instanceof import_zod.ZodNumber) {
    return convertZodNumber(schema);
  }
  if (schema instanceof import_zod.ZodBoolean) {
    return convertZodBoolean(schema);
  }
  if (schema instanceof import_zod.ZodDate) {
    return convertZodDate(schema);
  }
  if (schema instanceof import_zod.ZodEnum) {
    return convertZodEnum(schema);
  }
  if (schema instanceof import_zod.ZodNativeEnum) {
    return convertZodNativeEnum(schema);
  }
  if (schema instanceof import_zod.ZodUnion) {
    return convertZodUnion(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodIntersection) {
    return convertZodIntersection(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodRecord) {
    return convertZodRecord(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodTuple) {
    return convertZodTuple(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodFunction) {
    return convertZodFunction(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodPromise) {
    return convertZodPromise(schema, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodLiteral) {
    return convertZodLiteral(schema);
  }
  if (schema instanceof import_zod.ZodNull) {
    return convertZodNull(schema);
  }
  if (schema instanceof import_zod.ZodUndefined) {
    return convertZodUndefined(schema);
  }
  if (schema instanceof import_zod.ZodSymbol) {
    return convertZodSymbol(schema);
  }
  if (schema instanceof import_zod.ZodBigInt) {
    return convertZodBigInt(schema);
  }
  if (schema instanceof import_zod.ZodUnknown) {
    return convertZodUnknown(schema);
  }
  if (schema instanceof import_zod.ZodAny) {
    return convertZodAny(schema);
  }
  if (schema instanceof import_zod.ZodVoid) {
    return convertZodVoid(schema);
  }
  if (schema instanceof import_zod.ZodNever) {
    return convertZodNever(schema);
  }
  if (schema instanceof import_zod.ZodPipeline) {
    return convertSchema(schema._def.out, exportedSchemas);
  }
  if (schema instanceof import_zod.ZodDiscriminatedUnion) {
    return {
      type: "union",
      options: schema._def.options.map(
        (option) => createModelOrRef(option, exportedSchemas)
      )
    };
  }
  const typeName = "typeName" in schema._def ? schema._def.typeName : null;
  const message = [
    `WARNING: Zod type ${typeName ?? "<unknown>"} is not supported, using never.`,
    typeName && `If you'd like support for ${typeName} to be added, please create an issue: https://github.com/matejchalk/zod2md/issues/new`
  ].filter(Boolean).join("\n");
  console.warn(message);
  return { type: "never" };
}
function convertZodArray(schema, exportedSchemas) {
  const possibleValidations = [
    schema._def.minLength && ["min", schema._def.minLength.value],
    schema._def.maxLength && ["max", schema._def.maxLength.value],
    schema._def.exactLength && ["length", schema._def.exactLength.value]
  ];
  const validations = possibleValidations.filter(
    (value) => value != null
  );
  return {
    type: "array",
    items: createModelOrRef(schema.element, exportedSchemas),
    ...validations.length > 0 && { validations }
  };
}
function convertZodObject(schema, exportedSchemas) {
  return {
    type: "object",
    fields: Object.entries(schema._def.shape()).filter((pair) => pair[1] instanceof import_zod.ZodType).map(([key, value]) => ({
      key,
      required: !value.isOptional(),
      ...createModelOrRef(value, exportedSchemas, true)
    }))
  };
}
function convertZodString(schema) {
  return {
    type: "string",
    ...schema._def.checks.length > 0 && {
      validations: schema._def.checks.map((check) => {
        switch (check.kind) {
          case "min":
          case "max":
          case "length":
            return [check.kind, check.value];
          case "email":
          case "url":
          case "emoji":
          case "uuid":
          case "cuid":
          case "cuid2":
          case "ulid":
            return check.kind;
          case "regex":
            return [check.kind, check.regex];
          case "includes":
          case "startsWith":
          case "endsWith":
            return [check.kind, check.value];
          case "datetime":
            return [
              check.kind,
              { offset: check.offset, precision: check.precision }
            ];
          case "ip":
            return [check.kind, { version: check.version }];
          case "toLowerCase":
          case "toUpperCase":
          case "trim":
            return null;
        }
      }).filter((value) => value != null)
    }
  };
}
function convertZodNumber(schema) {
  return {
    type: "number",
    ...schema._def.checks.length > 0 && {
      validations: schema._def.checks.map((check) => {
        switch (check.kind) {
          case "min":
            return [check.inclusive ? "gte" : "gt", check.value];
          case "max":
            return [check.inclusive ? "lte" : "lt", check.value];
          case "multipleOf":
            return [check.kind, check.value];
          case "int":
          case "finite":
            return check.kind;
        }
      })
    }
  };
}
function convertZodBoolean(schema) {
  return {
    type: "boolean"
  };
}
function convertZodDate(schema) {
  return {
    type: "date"
  };
}
function convertZodEnum(schema) {
  return {
    type: "enum",
    values: schema._def.values
  };
}
function convertZodNativeEnum(schema) {
  return {
    type: "native-enum",
    enum: schema.enum
  };
}
function convertZodUnion(schema, exportedSchemas) {
  return {
    type: "union",
    options: schema._def.options.map(
      (option) => createModelOrRef(option, exportedSchemas)
    )
  };
}
function convertZodIntersection(schema, exportedSchemas) {
  return {
    type: "intersection",
    parts: [
      createModelOrRef(schema._def.left, exportedSchemas),
      createModelOrRef(schema._def.right, exportedSchemas)
    ]
  };
}
function convertZodRecord(schema, exportedSchemas) {
  return {
    type: "record",
    keys: createModelOrRef(schema._def.keyType, exportedSchemas),
    values: createModelOrRef(schema._def.valueType, exportedSchemas)
  };
}
function convertZodTuple(schema, exportedSchemas) {
  return {
    type: "tuple",
    items: schema._def.items.map(
      (item) => createModelOrRef(item, exportedSchemas)
    ),
    ...schema._def.rest != null && {
      rest: createModelOrRef(schema._def.rest, exportedSchemas)
    }
  };
}
function convertZodFunction(schema, exportedSchemas) {
  return {
    type: "function",
    // TODO: support rest args? what about implicit `...unknown[]`?
    parameters: schema._def.args.items.map(
      (param) => createModelOrRef(param, exportedSchemas)
    ),
    returnValue: createModelOrRef(schema._def.returns, exportedSchemas)
  };
}
function convertZodPromise(schema, exportedSchemas) {
  return {
    type: "promise",
    resolvedValue: createModelOrRef(schema._def.type, exportedSchemas)
  };
}
function convertZodLiteral(schema) {
  return {
    type: "literal",
    value: schema._def.value
  };
}
function convertZodNull(schema) {
  return {
    type: "null"
  };
}
function convertZodUndefined(schema) {
  return {
    type: "undefined"
  };
}
function convertZodSymbol(schema) {
  return {
    type: "symbol"
  };
}
function convertZodBigInt(schema) {
  return {
    type: "bigint",
    ...schema._def.checks.length > 0 && {
      validations: schema._def.checks.map((check) => {
        switch (check.kind) {
          case "min":
            return [check.inclusive ? "gte" : "gt", check.value];
          case "max":
            return [check.inclusive ? "lte" : "lt", check.value];
          case "multipleOf":
            return [check.kind, check.value];
        }
      })
    }
  };
}
function convertZodUnknown(schema) {
  return {
    type: "unknown"
  };
}
function convertZodAny(schema) {
  return {
    type: "any"
  };
}
function convertZodVoid(schema) {
  return {
    type: "void"
  };
}
function convertZodNever(schema) {
  return {
    type: "never"
  };
}

// src/formatter/markdown.ts
var document = (text) => `${text.trim()}
`;
var lines = (...texts) => texts.filter((text) => !!text).map((text) => `${text}
`).join("");
var paragraphs = (...texts) => texts.filter((text) => !!text).map(
  (text, i, arr) => text.replace(/\n+$/, i === arr.length - 1 ? "\n" : "")
).join("\n\n");
var heading = (level, text) => `${"#".repeat(level)} ${text}`;
var bold = (text, lang = "md") => lang === "html" ? `<b>${text}</b>` : `**${text}**`;
var italic = (text, lang = "md") => lang === "html" ? `<i>${text}</i>` : `_${text}_`;
var link = (href, text) => `[${text ?? href}](${href})`;
var code = {
  inline: (text) => "`" + text + "`",
  block: (text, lang) => lines("```" + lang, text, "```")
};
var list = {
  unordered: (items) => lines(...items.map((item) => `- ${item}`)),
  ordered: (items) => lines(...items.map((item, idx) => `${idx + 1}. ${item}`)),
  html: {
    unordered: (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`,
    ordered: (items) => `<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>`
  }
};
var table = (cells, headers, align) => {
  const alignSymbols = {
    left: ":--",
    center: ":-:",
    right: "--:"
  };
  const getColAlign = (index) => align?.[index] ?? "left";
  const rows = [
    ...headers ? [headers, headers.map((_, i) => alignSymbols[getColAlign(i)])] : [],
    ...cells
  ].map(
    (row) => row.map((cell) => cell.replace(/\|/g, "\\|").replace(/\n+/g, "<br />"))
  );
  const columnCount = Math.max(...rows.map((row) => row.length));
  const columnWidths = Array.from({ length: columnCount }).map(
    (_, i) => Math.max(...rows.map((row) => row[i]?.length ?? 0))
  );
  const formatCell = (cell, index) => {
    const width = columnWidths[index] ?? cell.length;
    const colAlign = getColAlign(index);
    if (cell === alignSymbols[colAlign]) {
      return `${cell[0]}${"-".repeat(width - cell.length)}${cell.slice(1)}`;
    }
    switch (colAlign) {
      case "left":
        return cell.padEnd(width, " ");
      case "right":
        return cell.padStart(width, " ");
      case "center":
        const toFill = width - cell.length;
        const fillLeft = Math.floor(toFill / 2);
        const fillRight = toFill - fillLeft;
        return " ".repeat(fillLeft) + cell + " ".repeat(fillRight);
    }
  };
  return lines(...rows.map((row) => `| ${row.map(formatCell).join(" | ")} |`));
};
var details = (summary, details2) => lines(
  "<details>",
  `<summary>${summary}</summary>`,
  `
${details2}
`.replace(/^\n{2,}/, "\n").replace(/\n{2,}$/, "\n"),
  "</details>"
);

// src/formatter/name-transform.ts
var import_node_path = require("path");
var defaultNameTransform = (name2, path) => {
  if (name2) {
    return formatName(name2);
  }
  const fileWithoutExt = (0, import_node_path.basename)(path).replace(/\.[cm]?[jt]sx?$/, "");
  if (fileWithoutExt !== "index") {
    return formatName(fileWithoutExt);
  }
  const parentDir = (0, import_node_path.dirname)(path).split(import_node_path.sep).at(-1);
  return formatName(parentDir);
};
var formatName = (name2) => {
  const converters = [
    kebabCaseToCamelCase,
    snakeCaseToCamelCase,
    dotCaseToCamelCase,
    stripSchemaSuffix,
    removeNonAlphaNumeric,
    capitalize
  ];
  return converters.reduce((acc, convert) => convert(acc), name2);
};
var kebabCaseToCamelCase = (str) => str.replace(/-./g, (c) => c[1]?.toUpperCase() ?? "");
var snakeCaseToCamelCase = (str) => str.replace(/_./g, (c) => c[1]?.toUpperCase() ?? "");
var dotCaseToCamelCase = (str) => str.replace(/\../g, (c) => c[1]?.toUpperCase() ?? "");
var stripSchemaSuffix = (str) => str.replace(/schema$/i, "");
var removeNonAlphaNumeric = (str) => str.replace(/[^a-z0-9]/gi, "");
var capitalize = (str) => (str[0]?.toUpperCase() ?? "") + str.slice(1);

// src/formatter/format.ts
var MAX_VALUES = 20;
function formatModelsAsMarkdown(models, options) {
  const { title, transformName = defaultNameTransform } = options;
  return document(
    paragraphs(
      heading(1, title),
      ...models.flatMap((model) => [
        heading(2, transformName(model.name, model.path)),
        model.description,
        formatModel(model, transformName) + metaToSuffix(model),
        "default" in model && `${italic("Default value:")} ${code.inline(
          formatLiteral(model.default)
        )}`
      ])
    )
  );
}
function formatModel(model, transformName) {
  switch (model.type) {
    case "array":
      if (model.items.kind === "model" && model.items.model.type === "object") {
        const formattedObject = formatModel(model.items.model, transformName);
        return formattedObject.replace("Object", "Array of objects");
      }
      const lengthPrefix = model.validations?.length ? smartJoin(
        model.validations.map(([key, value]) => {
          switch (key) {
            case "min":
              return `at least ${value}`;
            case "max":
              return `at most ${value}`;
            case "length":
              return `exactly ${value}`;
          }
        }),
        " and "
      ) + " " : "";
      const isPlural = model.validations?.every(([, value]) => value === 1) ?? true;
      return italic(
        `Array of ${lengthPrefix}${formatModelOrRef(
          model.items,
          transformName
        )} ${isPlural ? "items" : "item"}.`
      );
    case "object":
      const hasDefault = model.fields.some(
        (field) => "default" in metaFromModelOrRef(field)
      );
      const hasDescription = model.fields.some(
        (field) => metaFromModelOrRef(field).description
      );
      return paragraphs(
        italic("Object containing the following properties:"),
        table(
          model.fields.map((field) => {
            const meta = field.kind === "model" ? field.model : field.ref;
            return [
              field.required ? `${bold(code.inline(field.key))} (\\*)` : code.inline(field.key),
              ...hasDescription ? [meta.description ?? ""] : [],
              formatModelOrRef(field, transformName),
              ...hasDefault ? [
                "default" in meta ? code.inline(formatLiteral(meta.default)) : ""
              ] : []
            ];
          }),
          [
            "Property",
            ...hasDescription ? ["Description"] : [],
            "Type",
            ...hasDefault ? ["Default"] : []
          ]
        ),
        italic(
          model.fields.some(({ required }) => required) ? "(\\*) Required." : "All properties are optional."
        )
      );
    case "enum":
      const enumList = list.unordered(
        model.values.map((value) => code.inline(`'${value}'`))
      );
      return paragraphs(
        italic("Enum string, one of the following possible values:"),
        model.values.length > MAX_VALUES ? details(
          italic(
            `Expand for full list of ${model.values.length} values`,
            "html"
          ),
          enumList
        ) : enumList
      );
    case "native-enum":
      return paragraphs(
        italic("Native enum:"),
        table(
          nativeEnumEntries(model.enum).map(([key, value]) => [
            code.inline(key),
            code.inline(formatLiteral(value))
          ]),
          ["Key", "Value"]
        )
      );
    case "union":
      return paragraphs(
        italic("Union of the following possible types:"),
        list.unordered(
          model.options.map((option) => formatModelOrRef(option, transformName))
        )
      );
    case "intersection":
      return paragraphs(
        italic("Intersection of the following types:"),
        list.unordered(
          model.parts.map((part) => formatModelOrRef(part, transformName))
        )
      );
    case "record":
      return paragraphs(
        italic("Object record with dynamic keys:"),
        list.unordered([
          `${italic("keys of type")} ${formatModelOrRef(
            model.keys,
            transformName
          )}`,
          `${italic("values of type")} ${formatModelOrRef(
            model.values,
            transformName
          )}`
        ])
      );
    case "tuple":
      return paragraphs(
        italic(
          `Tuple, array of ${model.items.length}${model.rest ? "+" : ""} items:`
        ),
        list.ordered(
          model.items.map((item) => formatModelOrRef(item, transformName))
        ),
        model.rest && italic(
          `... followed by variable number of ${formatModelOrRef(
            model.rest,
            transformName
          )} items.`
        )
      );
    case "function":
      return paragraphs(
        italic("Function."),
        italic("Parameters:"),
        model.parameters.length > 0 ? list.ordered(
          model.parameters.map(
            (param) => formatModelOrRef(param, transformName)
          )
        ) : list.unordered([italic("none")]),
        italic("Returns:"),
        list.unordered([formatModelOrRef(model.returnValue, transformName)])
      );
    case "promise":
      return `${italic("Promise, resolves to value:")} ${formatModelOrRef(
        model.resolvedValue,
        transformName
      )}`;
    case "literal":
      return italic(
        `Literal ${code.inline(formatLiteral(model.value))} value.`
      );
    case "string":
    case "number":
    case "bigint":
      if (model.validations?.length) {
        return italic(
          `${capitalize2(model.type)} which ${smartJoin(
            model.validations.map((validation) => {
              if (typeof validation === "string") {
                switch (validation) {
                  case "email":
                  case "emoji":
                    return `is an ${validation}`;
                  case "url":
                  case "uuid":
                  case "cuid":
                  case "cuid2":
                  case "ulid":
                    return `is a valid ${validation.toUpperCase()}`;
                  case "int":
                    return "is an integer";
                  case "finite":
                    return "is finite";
                  case "safe":
                    return `is safe (i.e. between ${code.inline(
                      "Number.MIN_SAFE_INTEGER"
                    )} and ${code.inline("Number.MAX_SAFE_INTEGER")})`;
                }
              }
              const [kind, value] = validation;
              switch (kind) {
                // string
                case "min":
                case "max":
                  return `has a ${kind}imum length of ${value}`;
                case "length":
                  return `has an exact length of ${value}`;
                case "regex":
                  return `matches the regular expression ${code.inline(
                    value.toString()
                  )}`;
                case "includes":
                  return `includes the substring "${value}"`;
                case "startsWith":
                  return `starts with "${value}"`;
                case "endsWith":
                  return `ends with "${value}"`;
                case "datetime":
                  return `is a date and time in ISO 8601 format (${[
                    value.offset ? "UTC" : "any timezone offset",
                    ...value.precision != null ? [
                      `sub-second precision of ${value.precision} decimal places`
                    ] : []
                  ].join(",")})`;
                case "ip":
                  return `is in IP${value.version ?? ""} address format`;
                // number or bigint
                case "gt":
                  return `is greater than ${value}`;
                case "gte":
                  return `is greater than or equal to ${value}`;
                case "lt":
                  return `is less than ${value}`;
                case "lte":
                  return `is less than or equal to ${value}`;
                case "multipleOf":
                  return value === 2 ? "is even" : `is a multiple of ${value}`;
              }
            }),
            "and"
          )}.`
        );
      }
    case "boolean":
    case "date":
    case "symbol":
    case "null":
    case "undefined":
      return italic(`${capitalize2(model.type)}.`);
    case "unknown":
    case "any":
    case "void":
    case "never":
      return italic(`${capitalize2(model.type)} type.`);
  }
}
function metaFromModelOrRef(modelOrRef) {
  return modelOrRef.kind === "model" ? modelOrRef.model : modelOrRef.ref;
}
function metaToSuffix(meta) {
  const addon = smartJoin(
    ["optional", "nullable", "readonly"].filter((key) => meta[key]),
    "&"
  );
  return addon ? ` (${italic(addon)})` : "";
}
function formatModelOrRef(modelOrRef, transformName) {
  const meta = metaFromModelOrRef(modelOrRef);
  const suffix = metaToSuffix(meta);
  if (modelOrRef.kind === "ref") {
    return formatRefLink(modelOrRef.ref, transformName) + suffix;
  }
  return formatModelInline(modelOrRef.model, transformName) + suffix;
}
function formatRefLink(ref, transformName) {
  const name2 = transformName(ref.name, ref.path);
  const href = `#${slugify(name2)}`;
  return link(href, name2);
}
function formatModelInline(model, transformName) {
  switch (model.type) {
    case "array":
      const lengthPrefix = model.validations?.length ? smartJoin(
        model.validations.map(([key, value]) => {
          switch (key) {
            case "min":
              return `at least ${value}`;
            case "max":
              return `at most ${value}`;
            case "length":
              return `exactly ${value}`;
          }
        }),
        " and "
      ) + " " : "";
      const isPlural = model.validations?.every(([, value]) => value === 1) ?? true;
      if (model.items.kind === "ref") {
        return italic(
          `Array of ${lengthPrefix}${formatRefLink(
            model.items.ref,
            transformName
          )} ${isPlural ? "items" : "item"}`
        );
      }
      if (model.items.model.type === "object") {
        return paragraphs(
          italic(
            `Array of ${lengthPrefix}${isPlural ? "objects" : "object"}:`
          ),
          formatModelInline(model.items.model, transformName).replace(
            /^_[^_]+_/,
            ""
          )
        );
      }
      const itemType = stripCode(
        formatModelInline(model.items.model, transformName)
      );
      return code.inline(`Array<${itemType}>`) + (model.validations?.length ? ` (${italic(
        model.validations.map(([key, value]) => `${key}: ${value}`).join(", ")
      )})` : "");
    case "object":
      return italic("Object with properties:") + list.html.unordered(
        model.fields.map((field) => {
          const formattedType = formatModelOrRef(field, transformName);
          const { description: description2 } = metaFromModelOrRef(field);
          const formattedDescription = description2 ? ` - ${description2}` : "";
          return `${field.required ? `${bold(code.inline(field.key))} (\\*)` : code.inline(
            field.key
          )}: ${formattedType}${formattedDescription}`;
        })
      );
    case "enum":
      return code.inline(
        model.values.slice(0, MAX_VALUES).map((value) => `'${value}'`).concat(model.values.length > MAX_VALUES ? ["..."] : []).join(" | ")
      );
    case "native-enum":
      return italic("Native enum:") + list.html.unordered(
        nativeEnumEntries(model.enum).map(
          ([key, value]) => code.inline(`${key} = ${formatLiteral(value)}`)
        )
      );
    case "union":
      const formattedOptions = model.options.map(
        (option) => formatModelOrRef(option, transformName)
      );
      if (formattedOptions.every(isCode)) {
        return code.inline(formattedOptions.map(stripCode).join(" | "));
      }
      return smartJoin(formattedOptions, italic("or"));
    case "intersection":
      const formattedParts = model.parts.map(
        (part) => formatModelOrRef(part, transformName)
      );
      if (formattedParts.every(isCode)) {
        return code.inline(formattedParts.map(stripCode).join(" & "));
      }
      return smartJoin(formattedParts, italic("and"));
    case "record":
      const formattedKey = formatModelOrRef(model.keys, transformName);
      const formattedValue = formatModelOrRef(model.values, transformName);
      if (isCode(formattedKey) && isCode(formattedValue)) {
        return code.inline(
          `Record<${stripCode(formattedKey)}, ${stripCode(formattedValue)}>`
        );
      }
      return `${italic(
        "Object with dynamic keys of type"
      )} ${formattedKey} ${italic("and values of type")} ${formattedValue}`;
    case "tuple":
      const formattedItems = model.items.map(
        (item) => formatModelOrRef(item, transformName)
      );
      const formattedRest = model.rest && formatModelOrRef(model.rest, transformName);
      if (formattedItems.every(isCode) && (formattedRest == null || isCode(formattedRest))) {
        return "[" + [
          ...formattedItems.map(stripCode),
          ...formattedRest ? [`...${stripCode(formattedRest)}[]`] : []
        ].join(", ") + "]";
      }
      return italic("Tuple:") + list.html.ordered(formattedItems) + (formattedRest ? italic(`...and variable number of ${formattedRest} items`) : "");
    case "function":
      const formattedParameters = model.parameters.map(
        (param) => formatModelOrRef(param, transformName)
      );
      const formattedReturnValue = formatModelOrRef(
        model.returnValue,
        transformName
      );
      if (formattedParameters.every(isCode) && isCode(formattedReturnValue)) {
        return code.inline(
          `(${formattedParameters.map(stripCode).join(", ")}) => ${stripCode(
            formattedReturnValue
          )}`
        );
      }
      return paragraphs(
        italic("Function:"),
        list.html.unordered([
          `${italic("parameters:")} ${formattedParameters.length > 0 ? list.html.ordered(formattedParameters) : italic("none")}`,
          `${italic("returns:")} ${formattedReturnValue}`
        ])
      );
    case "promise":
      const formattedResolvedValue = formatModelOrRef(
        model.resolvedValue,
        transformName
      );
      if (isCode(formattedResolvedValue)) {
        return code.inline(`Promise<${stripCode(formattedResolvedValue)}>`);
      }
      return `${italic("Promise of")} ${formattedResolvedValue}`;
    case "literal":
      return code.inline(formatLiteral(model.value));
    case "date":
      return code.inline("Date");
    case "string":
    case "number":
    case "bigint":
      if (model.validations?.length) {
        const formattedValidations = model.validations.map(
          (validation) => {
            if (typeof validation === "string") {
              return validation;
            }
            const [kind, value] = validation;
            switch (kind) {
              case "gt":
                return `>${value}`;
              case "gte":
                return `\u2265${value}`;
              case "lt":
                return `<${value}`;
              case "lte":
                return `\u2264${value}`;
              case "multipleOf":
                return value === 2 ? "even" : `multiple of ${value}`;
              case "min":
              case "max":
                return `${kind} length: ${value}`;
              case "regex":
                return `${kind}: ${code.inline(value.toString())}`;
              case "datetime":
                const options = [
                  value.offset ? "" : "no timezone offset",
                  value.precision != null ? `${value.precision} decimals sub-second precision` : ""
                ].filter(Boolean).join(" and ");
                return options ? "ISO 8601" : `ISO 8601 - ${options}`;
              case "ip":
                return `IP${value.version ?? ""}`;
            }
            return `${kind}: ${value}`;
          }
        );
        return `${code.inline(model.type)} (${italic(
          formattedValidations.join(", ")
        )})`;
      }
    case "boolean":
    case "symbol":
    case "null":
    case "undefined":
    case "unknown":
    case "any":
    case "void":
    case "never":
      return code.inline(model.type);
  }
}
function formatLiteral(value) {
  switch (typeof value) {
    case "string":
      return value.includes("'") ? `"${value.replace(/"/g, '\\"')}"` : `'${value.replace(/'/g, "\\'")}'`;
    case "number":
    case "boolean":
    case "symbol":
    case "bigint":
      return value.toString();
    case "undefined":
      return "undefined";
    case "object":
      if (value === null) {
        return "null";
      }
      return JSON.stringify(value);
    case "function":
      return value.toString();
  }
}
function nativeEnumEntries(enumObj) {
  const numbers = Object.values(enumObj).filter(
    (value) => typeof value === "number"
  );
  const strings = Object.values(enumObj).filter(
    (value) => typeof value === "string"
  );
  if (numbers.length === strings.length && numbers.every((num) => typeof enumObj[num] === "string") && strings.every((str) => typeof enumObj[str] === "number")) {
    return Object.entries(enumObj).filter(
      ([, value]) => typeof value === "number"
    );
  }
  return Object.entries(enumObj);
}
function isCode(markdown) {
  return markdown.startsWith("`") && markdown.endsWith("`");
}
function stripCode(markdown) {
  return markdown.replace(/`/g, "");
}
function slugify(text) {
  return text.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
}
function smartJoin(items, sep2) {
  return items.reduce((acc, item, idx) => {
    const link2 = idx === 0 ? "" : idx === items.length - 1 ? ` ${sep2} ` : ", ";
    return acc + link2 + item;
  }, "");
}
function capitalize2(text) {
  return `${text[0]?.toUpperCase() ?? ""}${text.slice(1)}`;
}

// src/loader/find-schemas.ts
var import_zod2 = require("zod");
function findZodSchemas(modules) {
  return Object.entries(modules).flatMap(([path, mod]) => {
    if (mod instanceof import_zod2.ZodType) {
      return [{ schema: mod, path }];
    }
    return Object.entries(mod).filter(
      (pair) => pair[1] instanceof import_zod2.ZodType
    ).map(
      ([name2, schema]) => ({
        ...name2 !== "default" && { name: name2 },
        schema,
        path
      })
    );
  });
}

// src/loader/import.ts
var import_bundle_require = require("bundle-require");

// src/loader/utils.ts
function groupPromiseResultsByStatus(results) {
  return results.reduce(
    (acc, result) => result.status === "fulfilled" ? { ...acc, fulfilled: [...acc.fulfilled, result.value] } : { ...acc, rejected: [...acc.rejected, result.reason] },
    {
      fulfilled: [],
      rejected: []
    }
  );
}

// src/loader/import.ts
async function importModules(options) {
  const entries = Array.isArray(options.entry) ? options.entry : [options.entry];
  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      const { mod } = await (0, import_bundle_require.bundleRequire)({
        filepath: entry,
        tsconfig: options.tsconfig,
        format: options.format
      });
      if (typeof mod !== "object" || mod === null) {
        throw new Error("Expected module exports to be an object");
      }
      return [entry, mod];
    })
  );
  const { fulfilled, rejected } = groupPromiseResultsByStatus(results);
  rejected.forEach((reason) => {
    console.warn("Failed to load entry point", reason);
  });
  if (fulfilled.length === 0) {
    throw new Error("Failed to load any entry point");
  }
  return Object.fromEntries(fulfilled);
}

// src/loader/loader.ts
async function loadZodSchemas(options) {
  const modules = await importModules(options);
  return findZodSchemas(modules);
}

// src/index.ts
async function zod2md(options) {
  const schemas = await loadZodSchemas(options);
  const models = convertSchemas(schemas);
  return formatModelsAsMarkdown(models, options);
}

// src/cli/run.ts
var import_promises2 = require("fs/promises");
var import_path = require("path");

// src/cli/find-config.ts
var import_promises = require("fs/promises");
async function findDefaultConfig() {
  const name2 = "zod2md.config";
  const extensions = ["ts", "mjs", "js"];
  for (const ext of extensions) {
    const path = `${name2}.${ext}`;
    if (await fileExists(path)) {
      return path;
    }
  }
  return void 0;
}
function fileExists(path) {
  return (0, import_promises.stat)(path).then((stats) => stats.isFile()).catch(() => false);
}

// src/cli/import-config.ts
var import_bundle_require2 = require("bundle-require");
async function importConfig(path) {
  const { mod } = await (0, import_bundle_require2.bundleRequire)({ filepath: path, format: "esm" });
  return mod.default || mod;
}

// src/cli/parse-args.ts
var import_extra_typings = require("@commander-js/extra-typings");

// package.json
var name = "zod2md";
var version = "0.1.8";
var description = "Generate Markdown docs from Zod schemas";

// src/cli/parse-args.ts
async function parseArgs(argv) {
  const program = new import_extra_typings.Command().name(name).description(description).version(version).option("-c, --config <path>").option("-e, --entry <paths...>").option("-o, --output <path>").option("-t, --title <text>").option("--tsconfig <path>").addOption(
    new import_extra_typings.Option("-f, --format <format>").choices(["esm", "cjs"])
  );
  await program.parseAsync(argv);
  return program.opts();
}

// src/cli/resolve-config.ts
async function resolveConfig(argv) {
  const cliArgs = await parseArgs(argv);
  const configPath = cliArgs.config ?? await findDefaultConfig();
  if (!configPath) {
    assertCliArgsSufficient(cliArgs);
    return cliArgs;
  }
  const config = await importConfig(configPath);
  return { ...config, ...cliArgs };
}
function assertCliArgsSufficient(cliArgs) {
  const requiredArgs = typedObjectKeys({
    entry: true,
    output: true,
    title: true
  });
  const missingArgs = requiredArgs.filter((name2) => !cliArgs[name2]);
  if (missingArgs.length > 0) {
    throw new Error(
      `CLI arguments ${missingArgs.map((name2) => "`--" + name2 + "`").join(" and ")} are required when no config file is provided`
    );
  }
}
function typedObjectKeys(obj) {
  return Object.keys(obj);
}

// src/cli/run.ts
async function runCLI(handler, argv) {
  const config = await resolveConfig(argv);
  const markdown = await handler(config);
  await (0, import_promises2.mkdir)((0, import_path.dirname)(config.output), { recursive: true });
  await (0, import_promises2.writeFile)(config.output, markdown);
  console.info(`\u{1F680} Generated Markdown docs in ${config.output}`);
}

// src/bin.ts
runCLI(zod2md).catch(console.error);
