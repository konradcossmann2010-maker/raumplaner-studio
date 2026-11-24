/**
 * Ein Fehler, dessen Meldung für Nutzer gedacht ist und der einen
 * passenden HTTP-Status mitbringt. Alle anderen Fehler gelten als
 * unerwartet: Der Server antwortet dann mit 500 und einer allgemeinen
 * Meldung, damit keine internen Details (z. B. Datenbankfehler) nach
 * außen gelangen.
 */
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
