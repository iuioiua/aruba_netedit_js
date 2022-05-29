import { assert } from "./deps.ts";

/** Turns a set-cookie header into a useable cookie header value */
function getSetCookie(headers: Headers): string {
  return headers.get("set-cookie")!
    .split(", ")
    .flatMap((cookie) => cookie.split("; ")[0])
    .join("; ");
}

function getXSRFCookieValue(cookies: string): string {
  return cookies.split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN"))!
    .split("=")[1];
}

export interface ClientInit {
  host: string;
  username?: string;
  password?: string;
}

export class Client {
  #username: string;
  #password: string;
  #baseURL: string;
  #cookie?: string;
  #token?: string;

  constructor(init: ClientInit) {
    this.#username = init.username ??
      Deno.env.get("ARUBA_NETEDIT_USERNAME") ?? "admin";
    this.#password = init.password ??
      Deno.env.get("ARUBA_NETEDIT_PASSWORD") ?? "";
    this.#baseURL = "https://" + init.host;
  }

  async request(path: string, init?: RequestInit): Promise<Response> {
    const request = new Request(this.#baseURL + path, init);
    request.headers.set("cookie", this.#cookie!);
    request.headers.set("X-XSRF-TOKEN", this.#token!);
    return await fetch(request);
  }

  async login(): Promise<void> {
    const body = new FormData();
    body.set("username", this.#username);
    body.set("password", this.#password);
    const response = await this.request("/login", {
      method: "POST",
      body,
    });
    await response.body?.cancel();
    assert(response.ok);
    const setCookie = getSetCookie(response.headers);
    this.#cookie = setCookie;
    this.#token = getXSRFCookieValue(setCookie);
  }

  async logout(): Promise<void> {
    const response = await this.request("/logout", {
      method: "POST",
    });
    await response.body?.cancel();
    assert(response.ok);
    this.#cookie = undefined;
    this.#token = undefined;
  }

  async requestOnce(path: string, init?: RequestInit): Promise<Response> {
    await this.login();
    const response = await this.request(path, init);
    await this.logout();
    return response;
  }
}

export async function requestOnce(
  clientInit: ClientInit,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const client = new Client(clientInit);
  return await client.requestOnce(path, init);
}
