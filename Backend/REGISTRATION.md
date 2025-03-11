# Registration endpoint instructions
## Things to be send by frontend
1. Name
2. roll number
3. password
4. email
5. OTP
6. user's public RSA key (private key needs to be stored on backend) `USE_PULBLIC`
7. AES key (this will be randomly generated on frontend)
## How to encrypt 
1. Ask backend for RSA key (lets call this `RSA_KEY_1`)
2. Generate AES encryption key (lets call it `AES_KEY`)
3. Generate RSA keys for user (lets call it `USER_PRIVATE` and `USER_PUBLIC`)
4. Encrypt `AES_KEY` using `RSA_KEY_1`
5. Encrypt all other using `AES_KEY`
## How to save key `USER_PUBLIC` on user's end
1. In response to registration request above server will send an AES key (lets call is `SERVER_AES`) that will be encrypted using `USER_PUBLIC` so we can decrypt it using `USER_PRIVATE` 
2. encrypt both key:value pair `{'private_key':<USER_PRIVATE>}` using this AES key
## Use of each key 
1. `USER_PUBLIC` :- When someone has to send a message to a person he will encrypt it using that user's public key 
2. `USER_PRIVATE` :- This key will never be transmitted over network or stored on server so user has to keep it safe (if you want security at least  save your keys)(using zero-knowledge security)
3. `SERVER_AES` :- any message from server will be encrypted using this key including the keys stored on user end and messages stored on frontend
4. `AES_KEY`:- This was just a one time key and will never be used in future