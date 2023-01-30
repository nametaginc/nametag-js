/**
 * Copyright 2021 Nametag Inc.
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://developers.google.com/open-source/licenses/bsd
 */
import { PKCE } from "./pkce";
import { IStorage } from "./storage";
import { isMobile } from "./button";
import { detect } from "detect-browser";
import { DesktopSigninButton } from "./desktop-signin-button";
import { MobileSigninButton } from "./mobile-signin-button";
import { DesktopQRCode, DesktopQRCodeOptions } from "./desktop-qr-code";

export interface Options {
  // client_id is the OAuth 2.0 client ID obtained from the Nametag Developer
  // interface at https://console.nametag.co
  client_id: string;

  // redirect_uri is the URL where the browser will be redirected when authentication
  // completes. You'll need to provide a handler for this URL that invokes HandleCallback()
  redirect_uri: string;

  // The OAuth 2.0 scopes you are requesting for this authorization. Scopes must a subset of those defined for your app
  // in the Nametag console.
  scopes: Array<string>;

  // Arbitrary data that you define for your application. This value is passed to your CallbackURL upon completion of
  // the authorzation flow.
  state?: string;

  // Enable PKCE mode which is used for single page applications (default: true)
  pkce?: boolean;

  // An interface that is used to handle long-term token storage. The default is window.localStorage.
  localStorage?: IStorage;

  // The Nametag server to use. The default is https://nametag.co, which should be fine for nearly all cases.
  server?: string;
}

interface internalAuthorizeOptions {
  iframe?: boolean;
}

/* eslint-disable camelcase */
export interface Token {
  id_token: string;
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
  subject: string;
  firebase_custom_token?: string;
}
/* eslint-enable camelcase */

export type SigninButtonVariant = "blue" | "black" | "white";
export type SigninButtonIconPosition = "left" | "center";
export type SigninButtonPopupVariant = "concise" | "verbose";

export interface AuthorizeButtonOptions {
  variant?: SigninButtonVariant;
  icon_position?: SigninButtonIconPosition;
  popup_variant?: SigninButtonPopupVariant;
}

// Auth implements pure client-side authentication for Nametag.
export class Auth {
  private client_id: string;
  private redirect_uri: string;
  private scopes?: Array<string>;
  state?: string;
  private pkce: boolean;
  private localStorage: () => IStorage;
  public _server: string;
  private tokenLocalStorageKey = "__nametag_id_token";
  private watches: Array<TokenWatchImpl> = [];

  constructor(opts: Options) {
    // Nametag requires that your page be hosted via HTTPs (or on localhost)
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      throw new Error(
        "nametag: sign in with ID buttons only work when page is https"
      );
    }

    this.client_id = opts.client_id;
    if (!this.client_id) {
      throw new Error("nametag: you must supply client_id");
    }

    this.redirect_uri = opts.redirect_uri;
    if (!this.redirect_uri) {
      throw new Error("nametag: must supply redirect_uri");
    }

    this.scopes = opts.scopes;
    this.state = opts.state;
    this.pkce = opts.pkce ?? true;
    this.localStorage = () => opts.localStorage ?? window.localStorage;
    this._server = opts.server || "https://nametag.co";
  }

  IsCurrentOriginValid(): boolean {
    const url = new URL(this.redirect_uri);
    const redirectURIOrigin = url.origin;
    return redirectURIOrigin == window.origin;
  }

  async AuthorizeURL(
    internalOptions?: internalAuthorizeOptions
  ): Promise<string> {
    if (!this.scopes || !this.scopes.length) {
      throw new Error("nametag: you must supply scopes to call AuthorizeURL()");
    }

    const q = new URLSearchParams();
    q.set("client_id", this.client_id);
    q.set("scope", this.scopes.join(" "));
    if (!this.state) {
      this.state = await this.randomState();
    }
    q.set("state", this.state);
    q.set("redirect_uri", this.redirect_uri);

    if (this.pkce) {
      q.set("response_mode", "fragment");
      let pkce: PKCE;
      let localStorage = this.localStorage();
      this.vaccumLocalStorage();

      const codeVerifierTTL = 24 * 60 * 60 * 1000;
      const codeVerifierKey = await this.codeVerifierKey(this.state);
      let verifier = localStorage.getItem(codeVerifierKey);
      if (verifier) {
        console.debug(`nametag[${this.state}]: restoring stored verifier`);
        localStorage.setItem(
          codeVerifierKey + "_expires",
          (Date.now() + codeVerifierTTL).toString()
        );
        pkce = await PKCE.FromStored(verifier);
      } else {
        console.debug(`nametag[${this.state}]: generating new PKCE verifier`);
        pkce = await PKCE.New();
        localStorage.setItem(codeVerifierKey, pkce.verifier);
        localStorage.setItem(
          codeVerifierKey + "_expires",
          (Date.now() + codeVerifierTTL).toString()
        );
      }
      q.set("code_challenge", pkce.challenge);
      q.set("code_challenge_method", pkce.challengeMethod);
    }

    const browser = detect();
    switch (browser?.name) {
      case "chrome": // chrome, android/desktop
      case "crios": // chrome ios
        q.set("return", "chrome");
        break;
      case "firefox":
        q.set("return", "firefox");
        break;
      case "ios": // safari ios
      case "safari": // safari desktop
      default:
        q.set("return", "https");
        break;
    }

    let endpoint = "/authorize";
    if (internalOptions?.iframe) {
      endpoint = "/authorize/iframe";
    }

    const authorizeURL = this._server + endpoint + "?" + q.toString();
    return authorizeURL;
  }

  private vaccumLocalStorage() {
    const localStorage = this.localStorage();

    var keysToRemove: Array<string> = [];
    for (var i = 0, len = localStorage.length; i < len; i++) {
      try {
        var key = localStorage.key(i)!;
        var expires = localStorage.getItem(key + "_expires")!;
        if (Number.parseInt(expires) < Date.now()) {
          keysToRemove.push(key);
          keysToRemove.push(key + "_expires");
        }
      } catch (e) {
        // nop
      }
    }
    keysToRemove.map((key) => localStorage.removeItem(key));
  }

  private async randomState(): Promise<string> {
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let rv = "";
    for (let i = 0; i < 20; i++) {
      rv += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return rv;
  }

  private async codeVerifierKey(state: string): Promise<string> {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(state)
    );

    const digestArr = Array.from(new Uint8Array(digest));
    const digestStr = digestArr
      .map((byte) => String.fromCharCode(byte))
      .join("");
    const digestBase64 = btoa(digestStr);

    return "__nametag_code_verifier_" + digestBase64;
  }

  async exchangeCode(code: string): Promise<Token> {
    const body = new FormData();
    body.set("grant_type", "authorization_code");
    body.set("client_id", this.client_id);
    body.set("code", code);
    body.set("redirect_uri", this.redirect_uri);

    const codeVerifierKey = await this.codeVerifierKey(this.state!);
    const codeVerifier = this.localStorage().getItem(codeVerifierKey);
    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    } else {
      console.error("didn't find code verifier in local storage");
    }

    const resp = await fetch(this._server + "/token", {
      method: "POST",
      body: body,
    });
    if (resp.status >= 400) {
      const err = resp.headers.get("X-Error-Message") || (await resp.text());
      throw new Error(
        `(${this.state}): nametag: cannot exchange code for token: ` + err
      );
    }

    const token = (await resp.json()) as Token;
    return token;
  }

  async HandleCallback(): Promise<HandleCallbackResult | null> {
    if (!this.pkce) {
      throw new Error(
        "nametag: HandleCallback should only be called in PKCE mode"
      );
    }

    // In PKCE, the response is in the hash rather than the query string, e.g. e.g. "https://example.com/callback#code=1234&state=foobar"
    //
    // Note: window.location.hash includes the leading "#", so we have to strip that off before we parse it.
    const query = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const state = query.get("state");
    if (!state) {
      console.log("nametag: HandleCallback: state not found in query");
      return {};
    }
    this.state = state;

    const error = query.get("error");
    if (error) {
      console.error(`nametag: HandleCallback: error found in query: ${error}`);
      return { error: error };
    }
    const code = query.get("code");
    if (!code) {
      console.error(`nametag: HandleCallback: code not found in query`);
      return {};
    }

    const token = await this.exchangeCode(code);
    this.localStorage().setItem(
      this.tokenLocalStorageKey,
      JSON.stringify(token)
    );
    this.watches.map((w) => w.callback(token));

    this.vaccumLocalStorage();
    return { token: token };
  }

  WatchToken(onToken: (token: Token | null) => void): TokenWatch {
    if (!this.pkce) {
      throw new Error("nametag: WatchToken should only be called in PKCE mode");
    }
    const self = this;
    const eventHandler = (event: StorageEvent) => {
      if (event.key == self.tokenLocalStorageKey) {
        const t = self.Token();
        onToken(t);
      }
    };
    window.addEventListener("storage", eventHandler);

    // Always fire an event that provides the initial value of the token
    const initialToken = this.Token();
    window.setTimeout(() => {
      onToken(initialToken);
    }, 0);

    let rv: TokenWatchImpl = {
      close: () => {},
      callback: onToken,
    };
    rv.close = () => {
      self.watches = self.watches.filter((f) => f != rv);
      window.removeEventListener("storage", eventHandler);
    };

    this.watches.push(rv);
    return rv;
  }

  SignOut() {
    if (!this.pkce) {
      throw new Error("nametag: SignOut should only be called in PKCE mode");
    }
    this.localStorage().removeItem(this.tokenLocalStorageKey);
    this.watches.map((w) => w.callback(null));
  }

  SignedIn(): boolean {
    if (!this.pkce) {
      throw new Error("nametag: SignedIn should only be called in PKCE mode");
    }
    return !!this.Token();
  }

  Token(): Token | null {
    if (!this.pkce) {
      throw new Error("nametag: Token should only be called in PKCE mode");
    }
    const tokenStr = this.localStorage().getItem(this.tokenLocalStorageKey);
    if (!tokenStr) {
      return null;
    }
    return JSON.parse(tokenStr) as Token;
  }

  async GetProperties(scopes: string[]): Promise<Properties | null> {
    if (!this.pkce) {
      throw new Error(
        "nametag: GetProperties should only be called in PKCE mode"
      );
    }

    const token = this.Token();
    if (!token) {
      return null;
    }

    const resp = await fetch(
      this._server +
        "/people/me/properties/" +
        scopes.join(",") +
        "?token=" +
        encodeURI(token.id_token)
    );
    if (resp.status >= 400) {
      return null;
    }
    const respBody = await resp.json();

    return Properties.fromData(respBody);
  }

  AuthorizeButton(element: HTMLElement, options: AuthorizeButtonOptions) {
    if (isMobile()) {
      let _ = new MobileSigninButton(this, element, options);
    } else {
      let _ = new DesktopSigninButton(this, element, options);
    }
  }

  QRCode(element: HTMLElement, options: DesktopQRCodeOptions) {
    new DesktopQRCode(this, element, options);
  }
}

class Property {
  scope: string = "";
  value: any = null;
  exp: Date = new Date(0);

  static fromData(data: any): Property {
    const rv = new Property();
    rv.scope = data.scope;
    rv.value = data.value;
    rv.exp = new Date(data.exp);
    return rv;
  }
}

class Properties {
  subject: string = "";
  properties: Property[] = [];

  get(scope: string): Property | null {
    for (const prop of this.properties) {
      if (prop.scope === scope) {
        return prop;
      }
    }
    return null;
  }

  static fromData(data: any): Properties {
    const rv = new Properties();
    rv.subject = data.sub;
    rv.properties = [];
    if (data.properties) {
      for (const propData of data.properties) {
        const prop = Property.fromData(propData);
        rv.properties.push(prop);
      }
    }
    return rv;
  }
}

interface HandleCallbackResult {
  error?: string;
  token?: Token;
}

interface TokenWatchImpl extends TokenWatch {
  callback(token: Token | null): void;
}

export interface TokenWatch {
  close(): void;
}
