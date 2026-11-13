// Minimal types for Vercel's Node.js request/response helpers.
//
// These replace the @vercel/node package, which was only used for these two
// types and pulled in a large, vulnerable dev-dependency tree. Vercel's runtime
// provides the actual helpers (query, body, status, json, send) at run time.
import type { IncomingMessage, ServerResponse } from 'node:http';

export type VercelRequest = IncomingMessage & {
  query: Partial<Record<string, string | string[]>>;
  cookies: Partial<Record<string, string>>;
  body: any;
};

export type VercelResponse = ServerResponse & {
  send: (body: any) => VercelResponse;
  json: (body: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};
