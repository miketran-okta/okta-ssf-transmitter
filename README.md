# Okta Security Event Token (SET) Transmitter

A Node.js project to demonstrate how to generate and send a [Security Event Token (SET)](https://datatracker.ietf.org/doc/html/rfc8417) to the Okta Security Events API. This allows a third-party application (a "transmitter") to publish security signals to an Okta organization (a "receiver").

This project includes scripts to:

1.  Generate an RSA key pair and a corresponding public `jwks.json`.
2.  Construct and sign a SET payload as a JSON Web Token (JWT).
3.  Send the signed SET to the Okta API endpoint.

## Prerequisites

Before you begin, ensure you have the following:

  - **Node.js** (v18 or later recommended)
  - An **Okta organization** (developer or production tenant)
  - Administrative permissions in your Okta org to configure API integrations.

-----

## 🚀 Setup and Installation

Follow these steps to set up the project and configure your Okta integration.

### Step 1: Clone and Install Dependencies

First, clone this repository (or set up your project files) and install the necessary Node.js packages.

```bash
# Clone the repository (if you have one)
# git clone <your-repo-url>
# cd okta-ssf-transmitter

# Install dependencies
npm install
```

### Step 2: Generate Cryptographic Keys

You need an RSA key pair to sign the SETs. The public key will be shared with Okta via a JWKS (JSON Web Key Set) URL.

Run the key generation script:

```bash
node generate-keys.js
```

This command will create two important files:

  - `jwks.json`: Contains your **public key**. You will host this file publicly for Okta to access.
  - `private-keys.json`: Contains your **private key**. **NEVER** share this file or commit it to a public repository.

### Step 3: Host the `jwks.json` File

Okta needs to be able to retrieve your public key to verify your SET's signature. You must host the `jwks.json` file at a publicly accessible HTTPS URL.

A simple and free way to do this for development is using GitHub Gist:

1.  Go to [gist.github.com](https://gist.github.com).
2.  Name the file `jwks.json` and paste the content of your local `jwks.json` file into it.
3.  Click **"Create public gist"**.
4.  On the next page, click the **"Raw"** button.
5.  Copy the URL from your browser's address bar. This is your public `JWKS URL`. It will look something like: `https://gist.githubusercontent.com/YourUsername/.../raw/.../jwks.json`.

### Step 4: Configure the Integration in Okta

Now, you need to tell Okta to trust your application as a security event transmitter.

1.  Log in to your Okta Admin Console.
2.  Navigate to **Security \> API**.
3.  Go to the **Security Events** tab (or a similar section for event providers).
4.  Add a new integration or transmitter and provide the following:
      - **Issuer URL**: A unique URI that will identify your application. This URI must match the `ISSUER_URL` you will set in the `send-okta-event.js` script. Example: `https://my-ssf-transmitter.example.com`.
      - **JWKS URL**: The public URL where you hosted your `jwks.json` file in the previous step.

Save the integration. Okta is now ready to receive signed events from your issuer.

-----

## usage

To send a security event to Okta, first configure and then run the sending script.

### 1\. Configure the Script

Open the `send-okta-event.js` file and edit the configuration variables at the top:

  - **`OKTA_DOMAIN`**: Your Okta organization's URL (e.g., `dev-123456.okta.com`).
  - **`ISSUER_URL`**: The issuer URL you configured in the Okta admin console in Step 4. **This must be an exact match.**
  - **`PRIVATE_KEYS_FILE`**: The path to your private key file. The default (`./private-keys.json`) should be correct if you ran `generate-keys.js` in the project root.

### 2\. Run the Script

Execute the script from your terminal:

```bash
node send-okta-event.js
```

### Expected Output

If successful, the script will log the payload, the signed JWT, and finally a success message. The Okta API returns an `HTTP 204 No Content` response upon successful ingestion of the event.

```
Loading private key...
Using key with kid (Key ID): ...
Constructed SET Payload (JWT Claims): { ... }

Generated Signed SET (JWT):
 eyJ0eXAiOiJzZWNldmVudCtqd3QiLCJraWQiOiJ...

Sending signed SET to endpoint: https://your-okta-domain.okta.com/security/api/v1/security-events

✅ Success! Okta responded with: 204 No Content
This means the event was accepted successfully.
```

You can verify that the event was received by checking your Okta System Log.

-----

## ⚠️ Security Notice

The `private-keys.json` file contains sensitive cryptographic material that proves your identity to Okta. Treat it like a password.

  - **DO NOT** commit `private-keys.json` to any Git repository.
  - Use environment variables or a secure secret management system to handle the private key in production environments.

To prevent accidental commits, add it to your `.gitignore` file:

```
# .gitignore

node_modules
private-keys.json
```