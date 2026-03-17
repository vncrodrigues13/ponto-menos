export class CreatePunchinDto {
  timestamp: string; // ISO date string
  platform: string;
  /** Raw authentication token; the service will resolve this to an email */
  authToken: string;
}
