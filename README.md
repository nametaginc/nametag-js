# Nametag Authentication Client (Javascript)

This is the authorization client for browser-side OAuth 2.0 sign in with Nametag. Learn more about Nametag at https://getnametag.com.

1. Sign up for a Nametag developer account at https://console.nametag.co

2. Create an app. Make sure to set up a callback URL into your app. Obtain your client ID (you don't need the client secret).

3. Initialize the client

```typescript
import { Auth } from "@nametag/browser";

var nametag = Auth({ 
    client_id: "YOUR_CLIENT_ID",
    redirect_uri: window.location.origin + "/oauth/callback", 
    scopes: ["nt:name", "nt:email"], // you must define these scopes for your app in the Nametag console.
    state: window.location.pathname + window.location.search, // or whatever the next URL is
});
```

4. Check if the user is already authorized:

```typescript
if (!auth.Token()) {
  // ... show login button
}
```

5. When it's time to log in, add a handler

```typescript
// click handler for the "Sign in with ID" button
const onLoginButtonClick = async () => {
  const url = await nametag.AuthorizeURL();
  window.location.assign(url);
};
// add button here
```

6. On page load, handle the authentication callback:

```typescript
// client side handler for the callback URL
const handleCallback = async () => {
  if (window.location.pathname !== "/oauth/callback") {
    return;
  }

  const result = await nametag.HandleCallback();
  if (result && result.token) {
    console.log("signed in as " + token.subject);
    window.location.assign(nametag.state);
  }
};
document.addEventListener("load", handleCallback);
```

7. When the user is already authorized, fetch properties:

```typescript
if (nametag.SignedIn()) {
  const props = await auth.GetProperties(["nt:name", "nt:email"]);
  console.log("user id: " + props.subject);
  console.log("user name: " + props.get("nt:name"));
}
```

8. When it's time to sign out:

```typescript
const onSignoutButtonClicked = () => {
  nametag.SignOut();
};
```
