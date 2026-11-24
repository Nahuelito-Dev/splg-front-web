import { AxiosError, isAxiosError, type AxiosResponse } from 'axios';
import { env } from '../../config/env';
import { apiErrorFromGraphql, type GraphqlErrorBody } from './errors';
import type { TypedDocumentString } from './gql/graphql';
import { handleApiError, http } from './httpClient';

interface GraphqlResponse<R> {
  data?: R | null;
  errors?: GraphqlErrorBody[];
}

const isGraphqlBody = (value: unknown): value is GraphqlResponse<unknown> =>
  typeof value === 'object' && value !== null && Array.isArray((value as GraphqlResponse<unknown>).errors);

/**
 * El error HTTP que daría la misma falla en REST: estado de `extensions.statusCode` y el cuerpo de siempre
 * (`{statusCode, message, code}`), con el pedido original (sus encabezados de sesión de soporte y empresa propia, y la
 * marca de reintento). Así `handleApiError` decide igual que para un pedido REST.
 */
const asHttpError = (error: GraphqlErrorBody, status: number, response: AxiosResponse): AxiosError => {
  const code = typeof error.extensions?.code === 'string' ? error.extensions.code : undefined;
  const httpResponse = { ...response, status, data: { statusCode: status, message: error.message, code } };
  return new AxiosError(error.message, `ERR_GRAPHQL_${status}`, response.config, response.request, httpResponse);
};

/**
 * Lee la respuesta de GraphQL. Un error con estado (`extensions.statusCode`) pasa por los mismos efectos que un error
 * REST (`handleApiError`): si el 401 se resolvió renovando el token, se lee la respuesta del reintento (uno solo: el
 * pedido ya va marcado); si no, sale como `ApiError` con el texto y el `code` del back.
 */
async function readResponse<R>(response: AxiosResponse<GraphqlResponse<R>>): Promise<R> {
  const [error] = response.data.errors ?? [];
  if (error) {
    const status = error.extensions?.statusCode;
    if (typeof status !== 'number') throw apiErrorFromGraphql(error);
    const httpError = asHttpError(error, status, response);
    let retried: AxiosResponse<GraphqlResponse<R>>;
    try {
      retried = (await handleApiError(httpError)) as AxiosResponse<GraphqlResponse<R>>;
    } catch (failure) {
      if (failure === httpError) throw apiErrorFromGraphql(error);
      throw failure;
    }
    return readResponse(retried);
  }
  if (!response.data.data) throw apiErrorFromGraphql({ message: 'La API no devolvió datos' });
  return response.data.data;
}

/**
 * Ejecuta una consulta de la API GraphQL (sólo lectura). Va por el mismo cliente HTTP que la REST: el token, el
 * `X-Client-Source`, la sesión de soporte y la empresa propia se agregan igual, y los efectos de un error (Sentry,
 * renovar el token, fin del modo soporte, módulos) son los mismos aunque el error de GraphQL viaje con 200. La consulta
 * es un string tipado por codegen (`npm run graphql:types`), así que el panel no carga la librería `graphql`.
 */
export async function graphqlRequest<R, V>(document: TypedDocumentString<R, V>, variables: V): Promise<R> {
  let response: AxiosResponse<GraphqlResponse<R>>;
  try {
    response = await http.post<GraphqlResponse<R>>(env.graphqlUrl, { query: document.toString(), variables });
  } catch (failure) {
    // Lo que Apollo rechaza antes de ejecutar (sintaxis, límites, CSRF) viaja con 400 y el cuerpo de GraphQL: el
    // interceptor ya actuó; sólo falta el texto del back.
    const rejected = isAxiosError(failure) ? failure.response : undefined;
    if (rejected && isGraphqlBody(rejected.data)) {
      const [error] = rejected.data.errors ?? [];
      if (error) {
        throw apiErrorFromGraphql({ ...error, extensions: { statusCode: rejected.status, ...error.extensions } });
      }
    }
    throw failure;
  }
  return readResponse(response);
}
