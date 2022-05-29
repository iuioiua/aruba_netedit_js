import { requestOnce } from "./mod.ts";
import { assert } from "./deps.ts";

//** All environmental variables need to be defined */
Deno.test("requestOnce", async () => {
  const response = await requestOnce({
    host: Deno.env.get("ARUBA_NETEDIT_HOST")!,
  }, "/actuator/info");
  assert(response.ok);
  await response.body?.cancel();
});
