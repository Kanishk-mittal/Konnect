## Packet format
- message encrypted using random aes
- Aes key encrypted with public key of receiver 
- group :- true if group false if dm encrypted using server aes since server need to read this
- receiver:- person's roll number or group's id server aes since server need to see this info

## Keys
- Random Aes generated to encrypt the message
- server aes which is received during login 