/**
 * Copyright 2021 Nametag Inc.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:

 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const verifierLenth = 43

export class PKCE {
  verifier: string = '';
  challenge: string = '';
  challengeMethod: 'S256' | 'plain' = 'plain';

  static async New (): Promise<PKCE> {
    const rv = new PKCE()

    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < verifierLenth; i++) {
      rv.verifier += alphabet.charAt(
        Math.floor(Math.random() * alphabet.length)
      )
    }

    rv.challengeMethod = 'plain'
    rv.challenge = rv.verifier
    try {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(rv.verifier)
      )

      const digestArr = Array.from(new Uint8Array(digest))
      const digestStr = digestArr
        .map((byte) => String.fromCharCode(byte))
        .join('')
      const digestBase64 = btoa(digestStr)

      rv.challenge = digestBase64
      rv.challengeMethod = 'S256'
    } catch (err) {
      // no change
    }

    return rv
  }
}
