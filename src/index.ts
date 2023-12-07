import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);
import handleProxy from './proxy';
import handleRedirect from './redirect';
import apiRouter from './router';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            // Add logic to decide whether to serve an asset or run your original Worker code
            return await getAssetFromKV(
                {
                    request,
                    waitUntil: ctx.waitUntil.bind(ctx),
                },
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: assetManifest,
                }
            );
        } catch (e) {
            let pathname = new URL(request.url).pathname;
            return new Response(`"${pathname}" not found`, {
                status: 404,
                statusText: 'not found',
            });
        }
    },
};
