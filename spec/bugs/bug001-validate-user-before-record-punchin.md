## WHAT
the punchin is being recorded even if the user does not exist

## TODO 
- [x] On `punchin.service.ts`, before save the punchin, validate if the user exists, the user could be validated using `findUserByEmailAddress` method on `user.service.ts`
- [x] If no user was found, throw an exception `NotFoundException` with message `User not found`
- [x] Create unit tests to ensure that will validate that the user exists before save the punchin
- [x] If the user exists, save the punchin