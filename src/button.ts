/**
 * Copyright 2022 Nametag Inc.
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://developers.google.com/open-source/licenses/bsd
 */

import { Auth, AuthorizeButtonOptions } from "./index";
import { detect } from "detect-browser";
import { styles } from "./styles";

export function isMobile() {
  const browser = detect();
  if (!browser) {
    // if browser detection fails, default to mobile because it's the simpler case
    return true;
  }
  return browser.os === "iOS" || browser.os === "Android OS";
}

export class MobileSigninButton {
  auth: Auth;
  container: HTMLElement;
  options: AuthorizeButtonOptions;
  button: Button;

  constructor(
    auth: Auth,
    container: HTMLElement,
    options: AuthorizeButtonOptions
  ) {
    this.auth = auth;
    this.container = container;
    this.options = options;

    this.button = new Button(
      options.variant || "blue",
      options.icon_position || "left"
    );
    this.addToDOM();

    this.initButtonMobile();
  }

  private async initButtonMobile() {
    const authorizeURL = await this.auth.AuthorizeURL();
    this.button.el.addEventListener("click", () => {
      window.location.assign(authorizeURL);
    });
  }

  addToDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // add our stylesheet to the DOM
    if (!document.getElementById("nt-style")) {
      const style = document.createElement("style");
      style.id = "nt-style";
      style.innerText = styles;
      document.head.appendChild(style);
    }

    this.container.appendChild(this.button.el);
  }

  removeFromDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}

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
  auth: Auth;
  container: HTMLElement;
  options: AuthorizeButtonOptions;
  button: Button;
  qr?: string;
  errorMessage?: string;
  popup?: Popup;

  // On desktop, we append an invisible iframe to the request which is handled by the server. This iframe is responsible
  // for creating and polling the request. It uses the postMessage() browser API to send messages back to the parent
  // frame which are processed by onMessage.
  iframe?: HTMLIFrameElement;

  constructor(
    auth: Auth,
    container: HTMLElement,
    options: AuthorizeButtonOptions
  ) {
    this.auth = auth;
    this.container = container;
    this.options = options;
    this.button = new Button(
      options.variant || "blue",
      options.icon_position || "left"
    );
    this.button.el.addEventListener("click", this.togglePopup.bind(this));

    window.addEventListener("message", this.onMessage.bind(this));
    this.initFrame();
    this.addToDOM();
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
    this.popup.addElement(this.button.el);
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
      console.log("nametag: received QR code");
      this.qr = data.qr;
      this.popup?.showQR(data.qr);
    }

    switch (data.status) {
      case 100:
        return; // keep waiting

      case 400: // developer error
        console.error(
          "nametag: developer error: " + data.error_message ?? "(unknown)"
        );

        this.errorMessage = data.error_message ?? "Something went wrong";
        this.popup?.showError(this.errorMessage);
        return;

      case 403: // rejected
        console.log("nametag: user rejected the request");
        this.errorMessage = "You choose not to accept the request";
        this.popup?.showError(this.errorMessage);
        return;

      case 200:
        console.log("nametag: user accepted the request");
        this.hidePopup();
        if (!data.redirect_uri) {
          console.warn(
            "nametag: internal error: expected redirect_uri when status is 200"
          );
        } else {
          window.location.assign(data.redirect_uri);
        }
        return;
    }
  }

  addToDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // add our stylesheet to the DOM
    if (!document.getElementById("nt-style")) {
      const style = document.createElement("style");
      style.id = "nt-style";
      style.innerText = styles;
      document.head.appendChild(style);
    }

    this.container.appendChild(this.button.el);
  }

  removeFromDOM() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}

interface IframeEventData {
  state: string;
  qr?: string;
  status: 100 | 200 | 400 | 403;
  redirect_uri?: string;
  error_message?: string;
}

class Button {
  el: HTMLDivElement;
  imageLeft: HTMLImageElement;
  text: HTMLSpanElement;
  spacerRight: HTMLSpanElement;

  constructor(
    variant: "blue" | "black" | "white",
    iconPosition: "left" | "center"
  ) {
    this.el = document.createElement("div");
    this.el.classList.add("nt", "nt-btn-signin");

    this.imageLeft = document.createElement("img");
    this.imageLeft.classList.add("nt", "nt-btn-signin-icon");
    this.imageLeft.src =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOSAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSByPSI5IiB0cmFuc2Zvcm09Im1hdHJpeCgxIC0zLjAyMTFlLTEwIC0wLjAwODIwMzAzIDAuOTk5OTY2IDkuMDczODggOC45OTk3KSIgZmlsbD0iIzAwRkZBQSIvPgo8Y2lyY2xlIHI9IjYuMyIgdHJhbnNmb3JtPSJtYXRyaXgoMSAtMy4wMjExZS0xMCAtMC4wMDgyMDMwMyAwLjk5OTk2NiA5LjA3MzI3IDguOTk3NzkpIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIuODEzNiA2Ljk0MjAyQzEzLjA2NzcgNi42NDcxIDEzLjAzNjMgNi4yMDM5OSAxMi43NDM1IDUuOTUyMzFDMTIuNDUwNiA1LjcwMDYzIDEyLjAwNzIgNS43MzU2OSAxMS43NTMxIDYuMDMwNjJMNy45MzkyMyAxMC40NTcxTDYuNDAwNzkgOC44MDY0OEM2LjEzNzUyIDguNTI0MDEgNS42OTMzMyA4LjUxMDMyIDUuNDA4NjcgOC43NzU5MUM1LjEyNDAyIDkuMDQxNDkgNS4xMDY2OCA5LjQ4NTc3IDUuMzY5OTYgOS43NjgyNEw3LjQ0MDUxIDExLjk4OThDNy41NzYwMyAxMi4xMzUyIDcuNzY3NTEgMTIuMjE1NSA3Ljk2NzA3IDEyLjIxMDdDOC4xNjY2MyAxMi4yMDU5IDguMzU1NDIgMTIuMTE2NCA4LjQ4NjIyIDExLjk2NDZMMTIuODEzNiA2Ljk0MjAyWiIgZmlsbD0iIzEyM0FCMiIgc3Ryb2tlPSIjMTIzQUIyIiBzdHJva2Utd2lkdGg9IjAuMjc5MDg2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==";
    this.el.appendChild(this.imageLeft);

    this.text = document.createElement("span");
    this.text.classList.add("nt", "nt-btn-signin-text");
    this.text.innerText = "Secure sign in with ID";
    this.el.appendChild(this.text);

    this.spacerRight = document.createElement("span");
    this.spacerRight.classList.add("nt", "nt-btn-signin-spacer");
    this.el.appendChild(this.spacerRight);

    switch (variant) {
      case "blue":
        this.el.classList.add("nt", "nt-btn-signin-blue");
        break;
      case "black":
        this.el.classList.add("nt", "nt-btn-signin-black");
        break;
      case "white":
        this.el.classList.add("nt", "nt-btn-signin-white");
        break;
    }

    switch (iconPosition) {
      case "left":
        this.el.classList.add("nt", "nt-btn-signin-icon-left");
        break;
      case "center":
        this.el.classList.add("nt", "nt-btn-signin-icon-center");
        break;
    }
  }
}

class Popup {
  el: HTMLDivElement;
  background: SVGElement;
  backgroundPath: SVGPathElement;
  content: HTMLDivElement;
  qr: HTMLImageElement;
  errorMessage: HTMLDivElement;
  caption: HTMLDivElement;
  captionImage: HTMLImageElement;
  captionText: HTMLDivElement;
  footer: HTMLDivElement;
  footerImage: HTMLImageElement;
  footerText: HTMLDivElement;

  constructor() {
    this.setPositionAndSize = this.setPositionAndSize.bind(this);

    this.el = document.createElement("div");
    this.el.classList.add("nt", "nt-popup");

    this.background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.background.classList.add("nt", "nt-popup-bg");
    this.background.setAttribute("viewBox", "0 0 176 276");
    this.background.setAttribute("fill", "none");
    this.el.appendChild(this.background);

    this.backgroundPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    this.backgroundPath.setAttribute("fill", "white");
    this.backgroundPath.setAttribute("d", this.makeBackgroundPath(176, 276));
    this.background.appendChild(this.backgroundPath);

    this.content = document.createElement("div");
    this.el.appendChild(this.content);

    this.qr = document.createElement("img");
    this.qr.classList.add("nt", "nt-popup-qr");
    this.content.appendChild(this.qr);

    this.errorMessage = document.createElement("div");
    this.errorMessage.classList.add("nt", "nt-popup-error-message");
    this.content.appendChild(this.errorMessage);

    this.caption = document.createElement("div");
    this.caption.classList.add("nt", "nt-popup-caption");
    this.content.appendChild(this.caption);

    this.captionImage = document.createElement("img");
    this.captionImage.classList.add("nt", "nt-popup-caption-image");
    this.captionImage.src =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMjEiIHZpZXdCb3g9IjAgMCAxNCAyMSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTcgMTcuODg4OUg3LjAxTTMgMjBIMTFDMTEuNTMwNCAyMCAxMi4wMzkxIDE5Ljc3NzYgMTIuNDE0MiAxOS4zODE3QzEyLjc4OTMgMTguOTg1OCAxMyAxOC40NDg4IDEzIDE3Ljg4ODlWMy4xMTExMUMxMyAyLjU1MTIxIDEyLjc4OTMgMi4wMTQyNCAxMi40MTQyIDEuNjE4MzNDMTIuMDM5MSAxLjIyMjQyIDExLjUzMDQgMSAxMSAxSDNDMi40Njk1NyAxIDEuOTYwODYgMS4yMjI0MiAxLjU4NTc5IDEuNjE4MzNDMS4yMTA3MSAyLjAxNDI0IDEgMi41NTEyMSAxIDMuMTExMTFWMTcuODg4OUMxIDE4LjQ0ODggMS4yMTA3MSAxOC45ODU4IDEuNTg1NzkgMTkuMzgxN0MxLjk2MDg2IDE5Ljc3NzYgMi40Njk1NyAyMCAzIDIwWiIgc3Ryb2tlPSIjNjY2NjY2IiBzdHJva2Utd2lkdGg9IjEuMjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K";
    this.caption.appendChild(this.captionImage);

    this.captionText = document.createElement("div");
    this.captionText.innerText = "Scan with your phone’s camera to continue";
    this.caption.appendChild(this.captionText);

    this.footer = document.createElement("div");
    this.footer.classList.add("nt", "nt-popup-footer");
    this.content.appendChild(this.footer);

    this.footerImage = document.createElement("img");
    this.footerImage.src =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOSAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSByPSI5IiB0cmFuc2Zvcm09Im1hdHJpeCgxIC0zLjAyMTFlLTEwIC0wLjAwODIwMzAzIDAuOTk5OTY2IDkuMDczODggOC45OTk3KSIgZmlsbD0iIzAwRkZBQSIvPgo8Y2lyY2xlIHI9IjYuMyIgdHJhbnNmb3JtPSJtYXRyaXgoMSAtMy4wMjExZS0xMCAtMC4wMDgyMDMwMyAwLjk5OTk2NiA5LjA3MzI3IDguOTk3NzkpIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIuODEzNiA2Ljk0MjAyQzEzLjA2NzcgNi42NDcxIDEzLjAzNjMgNi4yMDM5OSAxMi43NDM1IDUuOTUyMzFDMTIuNDUwNiA1LjcwMDYzIDEyLjAwNzIgNS43MzU2OSAxMS43NTMxIDYuMDMwNjJMNy45MzkyMyAxMC40NTcxTDYuNDAwNzkgOC44MDY0OEM2LjEzNzUyIDguNTI0MDEgNS42OTMzMyA4LjUxMDMyIDUuNDA4NjcgOC43NzU5MUM1LjEyNDAyIDkuMDQxNDkgNS4xMDY2OCA5LjQ4NTc3IDUuMzY5OTYgOS43NjgyNEw3LjQ0MDUxIDExLjk4OThDNy41NzYwMyAxMi4xMzUyIDcuNzY3NTEgMTIuMjE1NSA3Ljk2NzA3IDEyLjIxMDdDOC4xNjY2MyAxMi4yMDU5IDguMzU1NDIgMTIuMTE2NCA4LjQ4NjIyIDExLjk2NDZMMTIuODEzNiA2Ljk0MjAyWiIgZmlsbD0iIzEyM0FCMiIgc3Ryb2tlPSIjMTIzQUIyIiBzdHJva2Utd2lkdGg9IjAuMjc5MDg2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==";
    this.footer.appendChild(this.footerImage);

    this.footerText = document.createElement("div");
    this.footerText.classList.add("nt", "nt-popup-footer-text");
    this.footerText.innerText = "Secured by Nametag";
    this.footerText.addEventListener("click", () => {
      window.location.assign("https://getnametag.com");
    });
    this.footer.appendChild(this.footerText);
  }

  parent?: HTMLElement;

  addElement(parent: HTMLElement) {
    this.parent = parent;
    parent.insertAdjacentElement("afterend", this.el);

    window.addEventListener("load", this.setPositionAndSize);
    window.addEventListener("resize", this.setPositionAndSize);
    window.addEventListener("orientationchange", this.setPositionAndSize);
    this.setPositionAndSize();
  }

  removeElement() {
    this.parent = undefined;

    window.removeEventListener("load", this.setPositionAndSize);
    window.removeEventListener("resize", this.setPositionAndSize);
    window.removeEventListener("orientationchange", this.setPositionAndSize);

    this.el.remove();
  }

  setPositionAndSize() {
    let h = this.content.clientHeight + 19;
    let w = this.content.clientWidth + 3;
    this.background.style.height = `${h}px`;
    this.background.style.width = `${w}px`;
    this.background.setAttribute("viewBox", `0 0 ${w} ${h}`);
    this.backgroundPath.setAttribute("d", this.makeBackgroundPath(w, h));

    // position according to the parent
    if (this.parent) {
      const rect = this.parent.getBoundingClientRect();

      let top = window.scrollY + rect.y + rect.height + 13;
      let left = window.scrollX + rect.x + rect.width / 2;

      this.el.style.position = "absolute";
      this.el.style.top = `${top}px`;
      this.el.style.left = `${left}px`;

      // TODO(ross): make sure that we aren't going to exceed the window width
    }
  }

  showQR(imgSrc: string) {
    this.qr.style.opacity = "1";
    this.qr.src = imgSrc;
    this.setPositionAndSize();
  }

  showError(message: string) {
    this.qr.style.opacity = "0";
    this.errorMessage.style.display = "block";
    this.errorMessage.innerText = message;
    this.setPositionAndSize();
  }

  makeBackgroundPath(w: number, h: number): string {
    return `M${w / 2}
                1L${w / 2 - 14}
                19H24C11.2975
                19
                1
                29.2975
                1
                42V${h - 22}C1
                ${h - 10.297}
                11.2975
                ${h}
                24
                ${h}H${w - 22}C${w - 11.297}
                ${h}
                ${w - 1}
                ${h - 10.297}
                ${w - 1}
                ${h - 22}V42C${w - 1}
                29.2975
                ${w - 11.297}
                19
                ${w - 22}
                19H${w / 2 + 14}L${w / 2}
                1Z`;
  }
}
