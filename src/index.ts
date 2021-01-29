/**
 * Copyright 2021 Nametag Inc.
 *
 * All information contained herein is the property of Nametag Inc.. The
 * intellectual and technical concepts contained herein are proprietary, trade
 * secrets, and/or confidential to Nametag, Inc. and may be covered by U.S.
 * and Foreign Patents, patents in process, and are protected by trade secret or
 * copyright law. Reproduction or distribution, in whole or in part, is
 * forbidden except by express written permission of Nametag, Inc.
 */
import { PKCE } from "./pkce";

export interface Options {
  // ClientID is the OAuth 2.0 client ID obtained from the Nametag Developer
  // interface at https://nametag.co/manage
  ClientID: string;

  // CallbackURL is the URL where the browser will be redirected when authentication
  // completes. You'll need to provide a handler for this URL that invokes HandleCallback()
  CallbackURL?: string;
}

export class Token {
  idToken: string = "";
  accessToken: string = "";
  refreshToken: string = "";
  scope: string = "";
  expiresIn: number = 0;
  tokenType: string = "";
  subject: string = "";
  firebaseCustomToken?: string;

  static fromData(data: any): Token {
    const rv = new Token();
    rv.idToken = data.id_token || "";
    rv.accessToken = data.access_token || "";
    rv.refreshToken = data.refresh_token || "";
    rv.scope = data.scope || "";
    rv.expiresIn = data.expires_in || 0;
    rv.tokenType = data.token_type || "";
    rv.subject = data.subject || "";
    rv.firebaseCustomToken = data.firebase_custom_token || undefined;
    return rv;
  }
}

// Auth implements pure client-side authentication for Nametag.
export class Auth {
  ClientID: string;
  CallbackURL: string = window.location.origin + "/callback";

  sessionStorage = window.sessionStorage;
  localStorage = window.localStorage;
  server = "https://nametag.co";
  codeVerifierKey = "__nametag_code_verifier";
  tokenLocalStorageKey = "__nametag_id_token";

  constructor(opts: Options) {
    this.ClientID = opts.ClientID;
    if (opts.CallbackURL) {
      this.CallbackURL = opts.CallbackURL;
    }
  }

  // AuthorizeURL returns an
  async AuthorizeURL(scopes: string[], state: string): Promise<string> {
    const q = new URLSearchParams();
    q.set("client_id", this.ClientID);
    q.set("scope", scopes.join(" "));
    q.set("response_mode", "fragment");
    q.set("state", state);
    q.set("redirect_uri", this.CallbackURL);

    const pkce = await PKCE.New();
    this.sessionStorage.setItem(this.codeVerifierKey, pkce.verifier);

    q.set("code_challenge", pkce.challenge);
    q.set("code_challenge_method", pkce.challengeMethod);

    const authorizeURL = this.server + "/authorize?" + q.toString();
    return authorizeURL;
  }

  async ExchangeCode(code: string): Promise<Token> {
    const body = new FormData();
    body.set("grant_type", "authorization_code");
    body.set("client_id", this.ClientID);
    body.set("code", code);
    body.set("redirect_uri", this.CallbackURL);

    const codeVerifier = this.sessionStorage.getItem(this.codeVerifierKey);
    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    const resp = await fetch(this.server + "/token", {
      method: "POST",
      body: body,
    });
    if (resp.status >= 400) {
      const err = resp.headers.get("X-Error-Message") || (await resp.text());
      throw new Error("Cannot exchnage code for token: " + err);
    }
    return (await resp.json()) as Token;
  }

  async HandleCallback(): Promise<string | null> {
    const query = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const error = query.get("error");
    if (error) {
      throw new Error(error);
    }
    const code = query.get("code");
    if (!code) {
      throw new Error("Code parameter is missing from fragment");
    }

    const state = query.get("state");

    const token = await this.ExchangeCode(code);
    this.localStorage.setItem(this.tokenLocalStorageKey, JSON.stringify(token));

    return state;
  }

  Signout() {
    this.localStorage.removeItem(this.tokenLocalStorageKey);
  }

  SignedIn(): boolean {
    return !!this.Token();
  }

  Token(): Token | null {
    const tokenStr = this.localStorage.getItem(this.tokenLocalStorageKey);
    if (!tokenStr) {
      return null;
    }
    return JSON.parse(tokenStr) as Token;
  }

  async GetProperties(scopes: string[]): Promise<Properties | null> {
    const token = this.localStorage.getItem(this.tokenLocalStorageKey);
    if (!token) {
      return null;
    }

    const resp = await fetch(
      this.server +
        "/people/me/properties/" +
        scopes.join(",") +
        "?token=" +
        encodeURI(token)
    );
    if (resp.status >= 400) {
      return null;
    }
    const respBody = await resp.json();

    return Properties.fromData(respBody);
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
    for (const propData of data.properties) {
      const prop = Property.fromData(propData);
      rv.properties.push(prop);
    }
    return rv;
  }
}
