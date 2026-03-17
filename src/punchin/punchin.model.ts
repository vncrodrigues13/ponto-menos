export interface PunchinEntry {
  /** UTC timestamp of the event */
  timestamp: Date;

  /** Platform string ("ios", "android", "windows", etc.) */
  platform: string;

  /** Email address of the user who punched in */
  userEmail: string;
}
