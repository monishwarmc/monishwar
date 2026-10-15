import { NextRequest } from "next/server";

/**
 * A CORS shim for the certificate images.
 *
 * ## Why this has to exist
 *
 * The certificate wall draws each certificate as a texture on a plane, and a
 * WebGL texture is subject to CORS in a way an ordinary `<img>` is not. The
 * issuers' own hosts — Coursera's S3 bucket, Credly, Metacrafters — serve
 * their images without an `Access-Control-Allow-Origin` header, which is fine
 * for a web page and fatal for a texture. three.js cannot read the pixels, the
 * loader throws, and because a thrown loader error is not a suspension, it
 * escapes the `<Suspense>` boundary and takes the whole canvas down.
 *
 * So the browser asks this route instead, it fetches the image server-side
 * where CORS does not apply, and hands it back from our own origin.
 *
 * The 2D viewer in `UI/CertificateViewer` does *not* need this — it is a plain
 * `<img>` and can hotlink happily. Only the texture path does.
 *
 * ## Only the hosts we actually use
 *
 * An open image proxy is a gift to anyone who wants to launder traffic through
 * this domain, so the host has to be one the certificates actually come from.
 * Add to this list when you add a certificate from somewhere new; the wall
 * will show its placeholder until you do.
 */
const ALLOWED_HOSTS = new Set([
  "s3.amazonaws.com",
  "images.credly.com",
  "cdn-uploads.huggingface.co",
  "authoring.metacrafters.io",
  "wsrv.nl",
]);

/** Nothing here is bigger than a page-sized JPEG; refuse anything that is. */
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");

  if (!target) {
    return new Response("missing url", { status: 400 });
  }

  let parsed: URL;

  try {
    parsed = new URL(target);
  } catch {
    return new Response("bad url", { status: 400 });
  }

  /*
   * wsrv.nl is someone else's image proxy, and going through it is pointless
   * here: it exists to add CORS headers, which is this route's whole job. Two
   * of the certificates are recorded with a wsrv.nl address wrapping an S3
   * one, and under a cold load — sixteen images at once — it throttles and
   * returns 5xx while every other host is fine.
   *
   * So the wrapper is unwrapped and the real address fetched directly. The
   * inner address is validated against the same allowlist, so this cannot be
   * used to reach a host the list does not already permit.
   */
  if (parsed.hostname === "wsrv.nl") {
    const inner = parsed.searchParams.get("url");

    if (inner) {
      try {
        const unwrapped = new URL(inner);

        if (
          unwrapped.protocol === "https:" &&
          ALLOWED_HOSTS.has(unwrapped.hostname)
        ) {
          parsed = unwrapped;
        }
      } catch {
        // Leave it alone and let the fetch below decide.
      }
    }
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  /*
   * `cache: "no-store"`, deliberately.
   *
   * The obvious thing is `next: { revalidate }`, so the certificates sit in
   * Next's data cache. They do not fit: that cache has a couple of megabytes
   * per entry and these are full-page JPEGs, so every one of them logged
   * "Failed to set Next.js data cache ... item exceeds limit" and the fetch
   * came back empty. Caching belongs on the response instead — see the
   * `Cache-Control` below, which is what actually keeps the browser from
   * asking twice.
   *
   * One retry, because the issuers throttle: seventeen of these go out close
   * together on a cold load and a few come back 5xx on the first attempt.
   */
  const get = () =>
    fetch(parsed, { headers: { Accept: "image/*" }, cache: "no-store" }).catch(
      () => null,
    );

  let upstream = await get();

  if (!upstream?.ok) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    upstream = await get();
  }

  if (!upstream?.ok) {
    return new Response("upstream failed", { status: 502 });
  }

  const type = upstream.headers.get("content-type") ?? "";

  if (!type.startsWith("image/")) {
    return new Response("not an image", { status: 415 });
  }

  const body = await upstream.arrayBuffer();

  if (body.byteLength > MAX_BYTES) {
    return new Response("too large", { status: 413 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": type,
      // Same contract as the models: the picture at a given URL never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
