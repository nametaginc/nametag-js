/**
 * Copyright 2023 Nametag Inc.
 *
 * All information contained herein is the property of Nametag Inc.. The
 * intellectual and technical concepts contained herein are proprietary, trade
 * secrets, and/or confidential to Nametag, Inc. and may be covered by U.S.
 * and Foreign Patents, patents in process, and are protected by trade secret or
 * copyright law. Reproduction or distribution, in whole or in part, is
 * forbidden except by express written permission of Nametag, Inc.
 */

import { Auth } from ".";
import { getSrcString, IframeEventData } from "./button";
import { styles } from "./styles";
import { logoSVGB64 } from "./svg";

export interface DesktopQRCodeOptions {
  variant: "light" | "dark";
}

export class DesktopQRCode {
  private readonly el = document.createElement("div");
  private readonly qrContainer = document.createElement("div");
  private readonly qrImg = document.createElement("img");
  private readonly errorMessage = document.createElement("div");
  private readonly caption = document.createElement("div");
  private readonly captionImage = document.createElement("img");
  private readonly captionText = document.createElement("p");

  private iframe = document.createElement("iframe");

  constructor(
    private readonly auth: Auth,
    private readonly container: HTMLElement,
    { variant }: DesktopQRCodeOptions
  ) {
    this.errorMessage.classList.add(
      "nt-qr-code-error",
      "nt-qr-code-container-item"
    );

    this.qrContainer.appendChild(this.errorMessage);

    this.qrImg.classList.add("nt-qr-code-qr", "nt-qr-code-container-item");
    this.qrImg.style.opacity = "0";

    this.qrContainer.appendChild(this.qrImg);
    this.qrContainer.classList.add("nt-qr-code-container");

    this.el.appendChild(this.qrContainer);

    this.captionImage.src = getSrcString(logoSVGB64);

    this.captionText.innerText = "Secured by Nametag";
    this.captionText.classList.add("nt-qr-code-caption-text");

    if (variant === "light") {
      this.captionImage.classList.add("nt-qr-code-caption-icon-light");
      this.captionText.classList.add("nt-qr-code-caption-text-light");
    } else {
      this.captionImage.classList.add("nt-qr-code-caption-icon-dark");
      this.captionText.classList.add("nt-qr-code-caption-text-dark");
    }

    this.caption.classList.add("nt-qr-code-caption");
    this.caption.appendChild(this.captionImage);
    this.caption.appendChild(this.captionText);

    this.el.classList.add("nt-qr-code");
    this.el.appendChild(this.caption);

    this.addStylesheetToDOM();
    this.addToDOM();

    window.addEventListener("message", this.onMessage);
    this.initFrame();
  }

  private async initFrame() {
    if (!this.auth.IsCurrentOriginValid()) {
      console.error(
        `nametag[${this.auth.state}]: the origin of the redirect_uri must equal the current page's origin`
      );
      return;
    }

    const iframeURL = await this.auth.AuthorizeURL({ iframe: true });
    this.iframe = document.createElement("iframe");
    this.iframe.style.display = "none";
    this.iframe.src = iframeURL;
    this.container.appendChild(this.iframe);
  }

  // called when we receive a message from the iframe
  private onMessage = (evt: MessageEvent<IframeEventData>) => {
    if (
      evt.origin !== this.auth._server ||
      evt.source !== this.iframe.contentWindow
    ) {
      return;
    }

    const data = evt.data;
    if (data.state != this.auth.state) {
      return;
    }

    if (data.qr) {
      console.log(`nametag[${this.auth.state}]: received QR code`);
      this.qrImg.style.opacity = "1";
      this.qrImg.src = data.qr;
    }

    switch (data.status) {
      case 100:
        return; // keep waiting

      case 400: // developer error
        console.error(
          `nametag[${this.auth.state}]: developer error: ${
            data.error_message ?? "(unknown)"
          }`
        );

        this.qrImg.style.opacity = "0";
        this.errorMessage.innerText =
          data.error_message ?? "Something went wrong";
        return;

      case 403: // rejected
        console.log(`nametag[${this.auth.state}]: user rejected the request`);
        this.qrImg.style.opacity = "0";
        this.errorMessage.innerText = "You choose not to accept the request";
        return;

      case 200:
        console.log(`nametag[${this.auth.state}]: user accepted the request`);

        if (!data.redirect_uri) {
          console.warn(
            `nametag[${this.auth.state}]: internal error: expected redirect_uri when status is 200`
          );
        } else {
          window.location.assign(data.redirect_uri);
        }
        return;
    }
  };

  private addStylesheetToDOM() {
    if (!document.getElementById("nt-style")) {
      const style = document.createElement("style");
      style.id = "nt-style";
      style.innerText = styles;
      document.head.appendChild(style);
    }
  }

  private addToDOM() {
    this.removeFromDOM();
    this.container.appendChild(this.el);
  }

  private removeFromDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
