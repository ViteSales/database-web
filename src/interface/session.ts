import type {IDatabaseConnection} from "./connection.ts";

export interface IAuthenticatedSession {
	database: IDatabaseConnection;
	user: string;
}