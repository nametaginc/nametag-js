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

const verifierLenth = 43;

export class PKCE {
  verifier: string = "";
  challenge: string = "";
  challengeMethod: "S256" | "plain" = "plain";

  static async New(): Promise<PKCE> {
    const rv = new PKCE();

    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < verifierLenth; i++) {
      rv.verifier += alphabet.charAt(
        Math.floor(Math.random() * alphabet.length)
      );
    }

    rv.challengeMethod = "plain";
    rv.challenge = rv.verifier;
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(rv.verifier)
      );

      const digestArr = Array.from(new Uint8Array(digest));
      const digestStr = digestArr
        .map((byte) => String.fromCharCode(byte))
        .join("");
      const digestBase64 = btoa(digestStr);

      rv.challenge = digestBase64;
      rv.challengeMethod = "S256";
    } catch (err) {
      // no change
    }

    return rv;
  }
}
