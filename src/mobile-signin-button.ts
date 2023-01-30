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
import { hasCustomButton, Button } from "./button";
import { styles } from "./styles";

export class MobileSigninButton {
  button: HTMLElement;

  constructor(
    private readonly auth: Auth,
    private readonly container: HTMLElement,
    private readonly options: AuthorizeButtonOptions
  ) {
    let customButton = hasCustomButton(container);
    if (!customButton) {
      const button = new Button(
        options.variant || "blue",
        options.icon_position || "left"
      );
      this.button = button.el;
    } else {
      this.button = container;
    }

    this.addStylesheetToDOM();

    if (!customButton) {
      this.addToDOM();
    }

    this.initButtonMobile();
  }

  private async initButtonMobile() {
    const authorizeURL = await this.auth.AuthorizeURL();
    this.button.addEventListener("click", () => {
      window.location.assign(authorizeURL);
    });
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
