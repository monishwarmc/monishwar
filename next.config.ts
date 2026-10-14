import type { NextConfig } from "next";

/**
 * A year, which is as long as `max-age` is worth setting for.
 */
const A_YEAR = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  transpilePackages: ["three"],

  /**
   * Let the browser keep the heavy assets.
   *
   * Next serves everything in `public/` with `Cache-Control: public,
   * max-age=0`, because it cannot know whether a file will change. That is the
   * right default and the wrong one here: the models and the HDR are several
   * megabytes, and without this every reload spends a round trip per file
   * revalidating them before it can draw anything.
   *
   * `immutable` is the part that matters. Without it a reload still sends a
   * conditional request and waits for the 304; with it the browser serves
   * straight from disk and a second visit starts instantly.
   *
   * ## This is only safe because the URLs are content-addressed
   *
   * `immutable` means *never revalidate* — not "revalidate less". A browser
   * that has cached one of these will not ask about it again for a year, so
   * shipping a bad file under a name you then reuse leaves every visitor who
   * loaded it stuck with it, with no way to fix it from the server. That is
   * not hypothetical; it happened during the build of this feature.
   *
   * `pnpm models` therefore puts a hash of each file's contents in its name
   * and writes `constants/models.generated.ts`. A rebuilt model is a new URL,
   * so there is nothing to invalidate.
   *
   * **`models` is listed here on that basis. `textures` and `audio` are not
   * hashed — rename the file by hand if you change one.**
   */
  headers: async () => [
    {
      source: "/:path(models|textures|audio)/:file*",
      headers: [
        {
          key: "Cache-Control",
          value: `public, max-age=${A_YEAR}, immutable`,
        },
      ],
    },
  ],
};

export default nextConfig;
