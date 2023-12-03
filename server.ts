import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.4/mod.ts";

Deno.serve(req => {
  return serveDirWithTs(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});