import serverless from 'serverless-http';
import { app } from '../src/index.js';

const handler = serverless(app);

// Netlify Functions v2 hands us a web-standard Request whose properties are
// getter-only. serverless-http's AWS provider expects a plain Lambda-v1 event
// it can mutate, so we translate explicitly.
export default async function api(request) {
  const url = new URL(request.url);

  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.text() : undefined;

  const event = {
    httpMethod: request.method,
    path: url.pathname,
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    requestContext: { path: url.pathname, httpMethod: request.method, identity: {} },
    isBase64Encoded: false,
    body,
  };

  const result = await handler(event, {});

  const outHeaders = new Headers();
  if (result.headers) {
    Object.entries(result.headers).forEach(([k, v]) => outHeaders.set(k, String(v)));
  }
  if (result.multiValueHeaders) {
    Object.entries(result.multiValueHeaders).forEach(([k, values]) => {
      values.forEach((v) => outHeaders.append(k, String(v)));
    });
  }

  return new Response(result.body ?? '', {
    status: result.statusCode || 200,
    headers: outHeaders,
  });
}
