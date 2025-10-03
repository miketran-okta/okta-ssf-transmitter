const jose = require('node-jose');
const fs = require('fs').promises;

async function generateKeys() {
  console.log('Generating RSA key pair for signing SETs...');
  const keystore = jose.JWK.createKeyStore();

  // Generate a new RSA key, specifying the algorithm and intended use ('sig' for signing)
  const key = await keystore.generate('RSA', 2048, {
    alg: 'RS256',
    use: 'sig',
  });

  console.log('Key generated successfully.');
  console.log('Key ID (kid):', key.kid);

  // Get the public keys in JWKS format
  const publicJwks = keystore.toJSON();

  // Get all keys (including private components)
  const privateJwks = keystore.toJSON(true);

  // Write the public keys to a jwks.json file
  await fs.writeFile('jwks.json', JSON.stringify(publicJwks, null, 4));
  console.log('Public keys saved to jwks.json');

  // Write the private keys to a file.
  // IMPORTANT: Secure this file and never expose it publicly.
  await fs.writeFile('private-keys.json', JSON.stringify(privateJwks, null, 4));
  console.log('Private keys saved to private-keys.json. GUARD THIS FILE!');
}

generateKeys().catch(console.error);