# Encryption Routes
This Document contains all information regarding encryption.routes.ts

## Endpoints 
baseURL: `/api/encryption`

### 1. /aes/external-key
Method :- `POST`
Description :- Encrypts the external AES key with the user's provided public key. Requires authentication.
input :-
```json
{
    "publicKey": "base64_encoded_user_public_key"
}
```
controller :- `getExternalAESKey`
response :- Returns the encrypted AES key.
```json
{
    "status": true,
    "aesKey": "encrypted_aes_key_string"
}
```

### 2. /rsa/publicKey
Method :- `GET`
Description :- Retrieves the server's current RSA public key. Might trigger automatic key reroll if validation interval has passed.
input :- None
controller :- `getRSAPublicKey`
response :- Returns the public key and key ID.
```json
{
    "status": true,
    "publicKey": "base64_encoded_server_public_key",
    "keyId": "key_identifier"
}
```
