## WHAT
i want to add swagger on controllers, that would facilitate the testing of the endpoints.

## HOW
- Analyse the controller files, the input and output of endpoints, and add swagger annotations (like `@ApiTags()`, `@ApiOperation()`, and appropriate `@ApiResponse()` for success/error scenarios).
- Analyse the DTOs (Data Transfer Objects) and add `@ApiProperty()` annotations so that the request payloads are properly documented in the Swagger UI.
- Update the bootstrap function in `main.ts` to build and mount the Swagger module.

## TODO
- [x] add required dependencies (`@nestjs/swagger`, `swagger-ui-express`)
- [x] setup Swagger DocumentBuilder in `main.ts` and mount it to `/api`
- [x] add `@ApiTags()`, `@ApiOperation()`, and `@ApiResponse()` annotations to the `user.controller.ts` and `punchin.controller.ts`
- [x] add `@ApiProperty()` annotations to the related DTOs (e.g. `CreatePunchinDto`, etc.)
- [x] setup authentication definitions in `main.ts` and secure the endpoints in controllers (if there is bearer token auth)
- [x] validate if the swagger is working by accessing the http://localhost:8080/api endpoint
