## What
On this feature, let's create an endpoint to list all punchins from a user.

## How
Let's create a new Get Endpoint, which would recieve a emailAddress as a query param, and return all punchins from that user.

## Acceptance Criteria
- The emailAddress can not be null
- The emailAddress must exist on the user database
- The endpoint must return all punchins from that user
- The endpoint must return a 404 if the user does not exist
- The endpoint must return a 400 if the emailAddress is invalid
- The endpoint must return a 200 if the user exists and has punchins
- The endpoint must return a 200 if the user exists and has no punchins



## TODO
- [x] Create a service on punchin.service and punchin.repository, getPunchinsFromUser, which will return all punchins from that user
- [x] Create a endpoint on punchin.controller, getPunchinsFromUser, which will return all punchins from that user
- [x] Create a route on punchin.routes, getPunchinsFromUser, which will return all punchins from that user

## Tests
- [x] Test the endpoint with a valid emailAddress
- [x] Test the endpoint with an invalid emailAddress
- [x] Test the endpoint with an emailAddress that has no punchins
