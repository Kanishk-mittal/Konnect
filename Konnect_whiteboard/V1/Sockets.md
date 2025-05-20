there will be following sockets 
1. send message
2. receive message

## Alogorithm
change in plan now use this algorithm
1. get the receiver roll number
2. decode the receiver roll_number 
3. check if the receiver is online
4. if the receiver is not online save the message to database and return
5. else set the room as receiver roll number 
6. emit following attributes of message 
	1. sender 
	2. message
	3. key 
	4. timestamp 
	5. group (none if its a dm)
