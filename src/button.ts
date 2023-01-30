/**
 * Copyright 2022 Nametag Inc.
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://developers.google.com/open-source/licenses/bsd
 */

import { detect } from "detect-browser";
import { captionSVGB64, logoSVGB64 } from "./svg";

export function isMobile() {
  const browser = detect();
  if (!browser) {
    // if browser detection fails, default to mobile because it's the simpler case
    return true;
  }
  return browser.os === "iOS" || browser.os === "Android OS";
}

export interface IframeEventData {
  state: string;
  qr?: string;
  status: 100 | 200 | 400 | 403;
  redirect_uri?: string;
  error_message?: string;
}

export function getSrcString(svg: string) {
  return `data:image/svg+xml;base64,${svg}`;
}

export class Button {
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
    if (variant !== "white") {
      this.imageLeft.classList.add("nt-btn-inverted");
    }
    this.imageLeft.src = getSrcString(logoSVGB64);
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

export class Popup {
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
    this.captionImage.src = getSrcString(captionSVGB64);
    this.caption.appendChild(this.captionImage);

    this.captionText = document.createElement("div");
    this.captionText.innerText = "Scan with your phone’s camera to continue";
    this.caption.appendChild(this.captionText);

    this.footer = document.createElement("div");
    this.footer.classList.add("nt", "nt-popup-footer");
    this.content.appendChild(this.footer);

    this.footerImage = document.createElement("img");
    this.footerImage.src = getSrcString(logoSVGB64);
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

export function hasCustomButton(container: HTMLElement): boolean {
  let rv = false;
  container.childNodes.forEach((node) => {
    if (node.textContent?.match(/^\s*$/)) {
      return; // doesn't count
    }
    rv = true;
  });
  return rv;
}
