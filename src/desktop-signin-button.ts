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

import { Auth, AuthorizeButtonOptions } from ".";
import { Popup, hasCustomButton, Button, IframeEventData } from "./button";
import { styles } from "./styles";

//   Page loads:
//     1. listen for messages from iframe
//     2. create iframe, start polling
//
//  Frame loaded:
//     3. receive QR code or initialization error
//
//  Button toggled on:
//     4. show popup
//
//  Status 200 message received:
//     - redirect
//
//  Status >= 400 message received:
//     - popup in error state
//
//  Button toggled off:
//     6. hide popup
//     8. remove iframe from DOM
//     9. re-create iframe
//
export class DesktopSigninButton {
  button: HTMLElement;
  qr?: string;
  errorMessage?: string;
  popup?: Popup;

  // On desktop, we append an invisible iframe to the request which is handled by the server. This iframe is responsible
  // for creating and polling the request. It uses the postMessage() browser API to send messages back to the parent
  // frame which are processed by onMessage.
  iframe?: HTMLIFrameElement;

  constructor(
    private readonly auth: Auth,
    private readonly container: HTMLElement,
    private readonly options: AuthorizeButtonOptions
  ) {
    var customButton = hasCustomButton(container);
    if (customButton) {
      this.button = container;
    } else {
      var button = new Button(
        options.variant || "blue",
        options.icon_position || "left"
      );
      this.button = button.el;
    }

    this.button.addEventListener("click", this.togglePopup.bind(this));
    window.addEventListener("message", this.onMessage.bind(this));
    this.initFrame();

    this.addStylesheetToDOM();
    if (!customButton) {
      this.addToDOM();
    }
  }

  togglePopup() {
    if (this.popup) {
      this.hidePopup();
    } else {
      this.showPopup();
    }
  }

  hidePopup() {
    this.popup?.removeElement();
    this.popup = undefined;
    this.initFrame(); // reset the iframe
  }

  showPopup() {
    this.popup = new Popup();
    this.popup.addElement(this.button);
    if (this.errorMessage) {
      this.popup.showError(this.errorMessage);
    }
    if (this.qr) {
      this.popup.showQR(this.qr);
    }
  }

  private async initFrame() {
    // reset state
    this.qr = undefined;
    this.errorMessage = undefined;

    if (this.iframe !== undefined) {
      this.container.removeChild(this.iframe);
      this.iframe = undefined;
    }

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
  private onMessage(evt: MessageEvent<IframeEventData>) {
    if (evt.origin !== this.auth._server) {
      return;
    }
    if (evt.source !== this.iframe?.contentWindow) {
      return;
    }

    const data = evt.data;
    if (data.state != this.auth.state) {
      return;
    }

    if (data.qr) {
      console.log(`nametag[${this.auth.state}]: received QR code`);
      this.qr = data.qr;
      this.popup?.showQR(data.qr);
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

        this.errorMessage = data.error_message ?? "Something went wrong";
        this.popup?.showError(this.errorMessage);
        return;

      case 403: // rejected
        console.log(`nametag[${this.auth.state}]: user rejected the request`);
        this.errorMessage = "You choose not to accept the request";
        this.popup?.showError(this.errorMessage);
        return;

      case 200:
        console.log(`nametag[${this.auth.state}]: user accepted the request`);
        this.hidePopup();

        if (!data.redirect_uri) {
          console.warn(
            `nametag[${this.auth.state}]: internal error: expected redirect_uri when status is 200`
          );
        } else {
          window.location.assign(data.redirect_uri);
        }
        return;
    }
  }

  addStylesheetToDOM() {
    if (!document.getElementById("nt-style")) {
      const style = document.createElement("style");
      style.id = "nt-style";
      style.innerText = styles;
      document.head.appendChild(style);
    }
  }

  addToDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.button);
  }

  removeFromDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
