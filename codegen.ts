// Tipos de las consultas GraphQL del panel, generados del esquema de la API.
//   npm run graphql:types
// El esquema (`graphql/splg-api.graphql`) se copia del back (`src/graphql/esquema.graphql`, `npm run graphql:esquema`).
// `documentMode: 'string'`: cada consulta queda como un string tipado; el panel no carga la librería `graphql`.
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'graphql/splg-api.graphql',
  documents: ['src/services/api/**/*.ts', '!src/services/api/gql/**'],
  ignoreNoDocuments: false,
  generates: {
    'src/services/api/gql/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        documentMode: 'string',
        enumsAsTypes: true,
        useTypeImports: true,
        scalars: { DateTime: 'string' },
        avoidOptionals: { field: true, inputValue: false, object: true, defaultValue: false },
      },
    },
  },
};

export default config;
