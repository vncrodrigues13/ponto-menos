## WHAT
i want to add swagger on controllers, that would facilitate the testing of the endpoints.

## HOW
- Analyse the controller files, the input and output of endpoints, and add swagger annotations (like `@ApiTags()`, `@ApiOperation()`, and appropriate `@ApiResponse()` for success/error scenarios).
- Analyse the DTOs (Data Transfer Objects) and add `@ApiProperty()` annotations so that the request payloads are properly documented in the Swagger UI.
- Update the bootstrap function in `main.ts` to build and mount the Swagger module.

## TODO
- [ ] add required dependencies (`@nestjs/swagger`, `swagger-ui-express`)
- [ ] setup Swagger DocumentBuilder in `main.ts` and mount it to `/api`
- [ ] add `@ApiTags()`, `@ApiOperation()`, and `@ApiResponse()` annotations to the `user.controller.ts` and `punchin.controller.ts`
- [ ] add `@ApiProperty()` annotations to the related DTOs (e.g. `CreatePunchinDto`, etc.)
- [ ] setup authentication definitions in `main.ts` and secure the endpoints in controllers (if there is bearer token auth)
- [ ] validate if the swagger is working by accessing the http://localhost:3000/api endpoint
