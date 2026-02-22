# Admin Routes
This Document contains all information regarding admin.routes.ts

## Endpoints 
baseURL: `/api/admin`

### 2. /userID
Method :- `GET`
Description :- Checks if an admin is authenticated and returns the user's MongoDB `_id` from the JWT token.
Note :- Requires `authMiddleware` and `adminAuthMiddleware`.
controller :- Inline handler in routes
response :-
```json
{
    "userId": "65cad..."
}
```


