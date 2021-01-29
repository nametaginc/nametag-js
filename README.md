# Nametag Authentication Client (Javascript)

This is the authorization client for browser-side OAuth 2.0 sign in with Nametag. Learn more about Nametag at https://getnametag.com.

1. Sign up for a Nametag developer account at https://getnametag.com

2. Create an app. Make sure to set up a callback URL into your app. Obtain your client ID (you don't need the client secret).

3. Initialize the client

```typescript
import { Auth } from "nametag";

var nametag = Auth({ ClientID: "YOUR_CLIENT_ID" });
```

4. Check if the user is already authorized:

```typescript
if (!auth.Token()) {
  // ... show login button
}
```

5. When it's time to log in, add a handler

```typescript
// click handler for the "Login with Nametag" button
const onLoginButtonClick = async () => {
  const scopes = ["nt:name", "nt:email"];
  const state = window.location.pathname + window.location.search; // or whatever the next URL is
  const url = await nametag.AuthorizeURL(scopes, state);
  window.location.assign(url);
};
```

6. On page load, handle the authentication callback:

```typescript
// client side handler for the callback URL
const handleCallback = async () => {
  if (window.location.pathname !== "/oauth/callback") {
    return;
  }

  const state = await auth.HandleCallback();
  window.location.assign(state);

  const token = auth.Token();
  console.log("signed in as " + token.subject);
};
document.addEventListener("load", handleCallback);
```

7. When the user is already authorized, fetch properties:

```typescript
if (auth.SignedIn()) {
  const props = await auth.GetProperties(["nt:name", "nt:email"]);
  console.log("user id: " + props.subject);
  console.log("user name: " + props.get("nt:name"));
}
```

8. When it's time to sign out:

```typescript
const onSignoutButtonClicked = () => {
  auth.Signout();
};
```
