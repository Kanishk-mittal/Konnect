end user ko aes key bhejni hai 
ye internal aes key nahi hai (abhi common rakhte hai)
bhejne ke liye RSA encode karna ahi 
uske liye users me function likho jo user ki public key se encrpyt kar de AES key ko 
login ke baad user ko ye key chahiye hogi 
kyu ? apni private key aur database encryption key ki key:value decrypt karne ke liye 
user ka local database kis tarah encrypt kare ?
jo encryption key aayi hai us se encrypt kar lo
sab user ki apni private aur public key hai 
backup ke liye us user ki public key se encrypt kar do (files backup nahi hogi !!!!!!) 
register request ke saath hi public key bhi bhej di hai 
usi time AES Key bhej do 
so response aane ke baad private key ko local storeage  me save karna hai 
- har baar chat load karne par keys change kar dena 

what is the need of room here 
set the room as receiver roll numnber'
message kaha se aya hai vo frontend par check kar lenge 

so receiver should get the following 
1. sender 
2. message
3. key 
4. timestamp 
5. group 


start with encryption in group and then we will go for socket 
ok sir
