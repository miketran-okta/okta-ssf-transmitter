const jose = require('node-jose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;

// --- CONFIGURATION: UPDATE THESE VALUES ---
const OKTA_DOMAIN = 'demo-takolive.okta.com'; // e.g., dev-123456.okta.com
const ISSUER_URL = 'https://sec-ops-center.takolive.com'; // MUST MATCH the Issuer you configured in Okta to trust for this event type
const PRIVATE_KEYS_FILE = './private-keys.json';
// --- END CONFIGURATION ---

async function sendSecurityEvent() {
  try {
    // 1. Load your private key from the file
    console.log('Loading private key...');
    const privateKeysContent = await fs.readFile(PRIVATE_KEYS_FILE, 'utf8');
    const keystore = await jose.JWK.asKeyStore(JSON.parse(privateKeysContent));

    const [signingKey] = keystore.all({ use: 'sig' });
    if (!signingKey) {
      throw new Error('No signing key found in the private-keys.json file.');
    }
    console.log(`Using key with kid (Key ID): ${signingKey.kid}`);

    // 2. Construct the Security Event Token (SET) payload
    const now = Math.floor(Date.now() / 1000);
    const jti = uuidv4();
    const audience = `https://${OKTA_DOMAIN}`;

    const payload = {
      iss: ISSUER_URL,
      jti: jti,
      iat: now,
      aud: audience,      
      events: {
        // You can include one or more events in a single SET
        "https://schemas.okta.com/secevent/okta/event-type/user-risk-change": {
          subject: {
            user: {
              format: "email",
              email: "curtis.glass@takolive.com"
            }
          },
          current_level: "high",
          previous_level: "low",
          event_timestamp: now,
          initiating_entity: "policy",
          reason_admin: {
            "en": "User risk elevated based on unusually high volume of sensitive API calls (525) to NetSuite outside of business hours"
          }
        },
        "https://schemas.openid.net/secevent/caep/event-type/session-revoked": {
            subject: {
                user: {
                    format: "email",
                    email: "curtis.glass@takolive.com"
                }
            },
            event_timestamp: now,
            initiating_entity: "admin",
            reason_admin: {
                "en": "Assurance level increased following a sudden, large-scale file transfer (1.5GB) of proprietary source code documents to an unapproved cloud storage provider Box"
            }
        }
      }
    };    
      console.log('Constructed SET Payload (JWT Claims):', JSON.stringify(payload, null, 2));


      // 3. Sign the payload to create the JWT (the SET)
      // The header must specify the key ID (kid) and the token type (typ)
      console.log('Signing the SET payload to create the JWT...');
      const signedToken = await jose.JWS.createSign({
        format: 'compact',
        fields: {
          typ: 'secevent+jwt', // This type header is crucial for a SET
          kid: signingKey.kid,
          alg: 'RS256'
        }
      }, signingKey)
        .update(JSON.stringify(payload), 'utf8')
        .final();

      console.log('\nGenerated Signed SET (JWT):\n', signedToken);

      // 4. Send the SET to Okta's generic security events endpoint
      const endpoint = `https://${OKTA_DOMAIN}/security/api/v1/security-events`;
      console.log(`\nSending signed SET to endpoint: ${endpoint}`);

      // Note: Unlike the SSF Stream API, this endpoint does not use an SSWS API token.
      // Authentication is handled by verifying the JWT's signature against the
      // trusted issuer's public keys (JWKS).
      const response = await axios.post(endpoint, signedToken, {
        headers: {
          'Content-Type': 'application/secevent+jwt',
          'Accept': 'application/json'
        }
      });

      // A 204 No Content response is a success for this endpoint.
      if(response.status === 204) {
        console.log(`\n✅ Success! Okta responded with: ${response.status} No Content`);
    console.log("This means the event was accepted successfully.");
  } else {
    console.log('\n✅ Success! Okta responded with:', response.status, response.statusText);
    if (response.data) {
      console.log('Response Body:', response.data);
    }
  }

} catch (error) {
  console.error('❌ Error sending security event:');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else {
    console.error('Error Message:', error.message);
  }
}
}

sendSecurityEvent();