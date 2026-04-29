Feature: Passwordless authentication
  Registered users can request a one-time email code and exchange it for a JWT.

  Background:
    Given a registered user exists with email "user@example.com" and companyId 123

  Scenario: Registered user requests a login code
    When the user requests a login code for "user@example.com"
    Then the response status should be 202
    And the response message should be "If the email is registered, a login code will be sent."
    And a one-time code should be stored for "user@example.com"
    And the stored login code should be exactly 6 numeric digits
    And the login code should expire 10 minutes after it was created
    And the login code should start with 0 failed attempts
    And an email containing the code should be sent to "user@example.com"
    And the login code should be logged for local delivery

  Scenario: User logs in with a valid code
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 200
    And the response should contain an access token
    And the access token should include exactly the domain claims emailAddress "user@example.com" and companyId 123
    And the access token should expire in 1 hour
    And the code "123456" should be consumed

  Scenario: Configured JWT expiration is used
    Given JWT_EXPIRES_IN is configured as "15m"
    And an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 200
    And the access token should expire in "15m"

  Scenario: Production requires a JWT secret
    Given NODE_ENV is "production"
    And JWT_SECRET is not configured
    When the auth module starts
    Then startup should fail with an error in onModuleInit because JWT_SECRET is required

  Scenario: Unknown email receives generic response without a usable code
    When the user requests a login code for "missing@example.com"
    Then the response status should be 202
    And the response message should be "If the email is registered, a login code will be sent."
    And no login code should be stored for "missing@example.com"
    And no email should be sent to "missing@example.com"

  Scenario: AuthService catches NotFoundException for unknown users
    When the user requests a login code for "missing@example.com"
    Then UserService.findUserByEmailAddress should throw NotFoundException
    And AuthService should catch the exception silently
    And the response status should be 202

  Scenario: Email is normalized before requesting a code
    When the user requests a login code for " USER@EXAMPLE.COM "
    Then the response status should be 202
    And a one-time code should be stored for "user@example.com"
    And no login code should be stored for " USER@EXAMPLE.COM "
    And an email containing the code should be sent to "user@example.com"

  Scenario: Email is normalized before login
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email " USER@EXAMPLE.COM " and code "123456"
    Then the response status should be 200
    And the access token should include exactly the domain claims emailAddress "user@example.com" and companyId 123
    And the code "123456" should be consumed

  Scenario: Missing email is rejected when requesting a code
    When the user requests a login code without an email
    Then the response status should be 400
    And no login code should be stored

  Scenario: Invalid email format is rejected when requesting a code
    When the user requests a login code for "not-an-email"
    Then the response status should be 400
    And no login code should be stored

  Scenario: Missing email is rejected during login
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in without an email and code "123456"
    Then the response status should be 400
    And no access token should be returned

  Scenario: Missing code is rejected during login
    When the user logs in with email "user@example.com" and no code
    Then the response status should be 400
    And no access token should be returned

  Scenario: Invalid email format is rejected during login
    When the user logs in with email "not-an-email" and code "123456"
    Then the response status should be 400
    And no access token should be returned

  Scenario Outline: Invalid code format is rejected during login
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "<code>"
    Then the response status should be 400
    And no access token should be returned
    And the failed attempt count should not increase

    Examples:
      | code    |
      | abc123  |
      | 12345   |
      | 1234567 |
      | 123 456 |

  Scenario: Missing active code is rejected during login
    Given no active login code exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And no access token should be returned
    And the failed attempt count should not increase

  Scenario: Wrong code is rejected
    Given an active login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "000000"
    Then the response status should be 401
    And the code "123456" should not be consumed
    And the failed attempt count should increase

  Scenario: Expired code is rejected at the expiration boundary
    Given a login code "123456" exists for "user@example.com" that expires at the current instant
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And the response should explain that the code is expired or invalid
    And the failed attempt count should not increase

  Scenario: Expired code is rejected after the expiration boundary
    Given an expired login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And the response should explain that the code is expired or invalid
    And the failed attempt count should not increase

  Scenario: Reused code is rejected
    Given a consumed login code "123456" exists for "user@example.com"
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 401
    And no access token should be returned
    And the failed attempt count should not increase

  Scenario: Too many invalid attempts blocks the code
    Given an active login code "123456" exists for "user@example.com"
    And the code has reached the maximum of 5 failed attempts
    When the user logs in with email "user@example.com" and code "123456"
    Then the response status should be 429
    And no access token should be returned
    And the failed attempt count should not increase

  Scenario: Blocked code is found by findActiveByEmail but rejected by service
    Given an active login code "123456" exists for "user@example.com"
    And the code has reached the maximum of 5 failed attempts
    When findActiveByEmail is called for "user@example.com"
    Then the code "123456" should be returned
    And the service should reject the login with 429

  Scenario: Requesting a new code invalidates the previous active code
    Given an active login code "123456" exists for "user@example.com"
    When the user requests a login code for "user@example.com"
    Then the response status should be 202
    And the response message should be "If the email is registered, a login code will be sent."
    And the code "123456" should be invalidated
    And a new one-time code should be stored for "user@example.com"
    And only one active login code should exist for "user@example.com"
