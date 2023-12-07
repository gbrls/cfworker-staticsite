import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);
import handleProxy from './proxy';
import handleRedirect from './redirect';
import apiRouter from './router';

// src/index.ts
async function callWebhook(content, env) {
    try {
        const response = await fetch(env.WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content
            })
        });
        if (response.ok) {
            return new Response("blz valeu.", { status: 200 });
        } else {
            return new Response("deu bom.", { status: 500 });
        }
    } catch (error) {
        return new Response("deu ruim.", { status: 500 });
    }
}
function getFlag(request) {
    let country = request.headers.get("CF-IPCountry");
    return `:flag_${country?.toLowerCase()}:`;
}
function getCountry(request) {
    return request.headers.get("CF-IPCountry") || "none";
}
function getVerb(request) {
    let verb = request.method;
    let msg = "";
    for (const char of verb.toLowerCase()) {
        msg += `:regional_indicator_${char}:`;
    }
    return msg;
}
function getURLPath(request) {
    const parts = request.url.split("/");
    if (parts.length >= 4) {
        return "/" + parts.slice(3).join("/");
    } else {
        return "";
    }
}
function getHeaders(request) {
    let ua = request.headers.get("user-agent") || "?";
    return ua;
}
function getReferer(request) {
    let referer = request.headers.get("referer") || "";
    if (referer.length === 0) {
        return referer;
    }
    return `
:link: **Referer:** \`${referer}\``;
}
function getIP(request) {
    let ip = request.headers.get("cf-connecting-ip") || "";
    if (ip.length === 0) {
        return ip;
    }
    return `:globe_with_meridians: **IP:** \`${ip}\``;
}
function getCity(request) {
    return request.cf?.city || "";
}
async function myfetch(request, env, ctx) {
    const prefix = "/pixel";
    const currentTimeUTC = Math.floor(Date.now() / 1e3);
    const url = getURLPath(request);

    let new_url = url.substring(prefix.length);
    let p1 = env.DB.prepare("INSERT INTO pings (UserAgent, Referer, Country, Ip, Timestamp, URL, City) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").bind(
        getHeaders(request),
        request.headers.get("referer"),
        getCountry(request),
        request.headers.get("cf-connecting-ip"),
        currentTimeUTC,
        new_url,
        getCity(request)
    ).run();

    let p2 =  callWebhook(
        `${getVerb(request)} ${getFlag(request)} :twisted_rightwards_arrows: \`${getURLPath(request)}\`${getReferer(request)}
${getIP(request)}
:triangular_flag_on_post: **City:** ${getCity(request)}
:identification_card: **User Agent:**\`\`\`${getHeaders(request)}\`\`\``,
        env
    );
    return Promise.all([p1, p2]);
}


export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            //await myfetch(request, env, ctx);
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
