/**
 * Copyright 2021 Nametag Inc.
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://developers.google.com/open-source/licenses/bsd
 */

const verifierLenth = 43;

export class PKCE {
  verifier: string = "";
  challenge: string = "";
  challengeMethod: "S256" | "plain" = "plain";

  static async FromStored(verifier: string): Promise<PKCE> {
    const rv = new PKCE();
    rv.verifier = verifier;
    await rv.setChallenge();
    return rv;
  }

  static async New(): Promise<PKCE> {
    const rv = new PKCE();

    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < verifierLenth; i++) {
      rv.verifier += alphabet.charAt(
        Math.floor(Math.random() * alphabet.length)
      );
    }
    await rv.setChallenge();
    return rv;
  }

  async setChallenge() {
    this.challengeMethod = "plain";
    this.challenge = this.verifier;
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(this.verifier)
      );

      const digestArr = Array.from(new Uint8Array(digest));
      const digestStr = digestArr
        .map((byte) => String.fromCharCode(byte))
        .join("");
      const digestBase64 = btoa(digestStr);

      this.challenge = digestBase64;
      this.challengeMethod = "S256";
    } catch (err) {
      // no change
    }
  }
}
