## What
The goal is to write tests for the user module.

## How
Using jest and supertest, create a test file for each endpoint in the user module.

## T1 - When tries to register an user with existing email, should fail

Given a new user is attempt to register
When the email used on registry is already used by another user
Then the registry should fail

- Write a unit test
- On the `repo.findByEmail` function, mock one user output with the email being `johndoe@example.com`
- After the mock is returned, should throw an Conflict Exception
- The message error must be `User with email johndoe@example.com already exists`

## T2 - When tries to register an user with non-existing email, should succeed

Given a new user is attempt to register
When the email used on registry is not used by any user
Then the registry should succeed

- Write a unit test
- On the `repo.findByEmail` function, mock a null or undefined output
- After the mock is returned, should return the new user
- The function repo.save must have been called once


## T3 - When tries to save an error and the database connection fails, should fail

Given a new user is attempt to register
When the email used on registry is not used by any user
And the database connection fails
Then the registry should fail

- Write a unit test
- On the `repo.findByEmail` function, mock a null or undefined output
- The function `repo.save` must be called once, but mock it to throw an error (e.g., `new InternalServerErrorException()`)
- The service should capture the error, NOT return the user, and re-throw the generated error
- Should log the error message 'Error on user registration' using `logger.error`
- Should increment the userRegistrationErrorCounter




## T4 - When tries to find an user by email address with non-existing email, should fail

Given an user is attempt to find by email address
When the email used on find is not used by any user
Then the service should fail
And throw an exception

- Write a unit test
- On the `repo.findByEmail` function, mock a null or undefined output
- Then should throw an `NotFoundException`
- Increment `userFindByEmailNotFoundCounter`
- Log the warning 'User not found by email address' (Note: It should NOT log the .error() 'Error on user found by email address', because the try-catch ignores NotFoundException for the error counter)




## TODO 
- [x] Implement the test scenarios above
- [x] Run the tests
- [x] Assure the all the tests are passing
- [x] Do not remove or edit any other existing that





Respect and maintain the rules of `domain.md`
Use the `domain-user.md` as technical reference