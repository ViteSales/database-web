export function onDatabaseError(error: any) {
	let organizedMessage: string;
	if (error?.code) {
		organizedMessage = `Knex Error [${error.code}]: ${error.message}`;
	} else {
		organizedMessage = `Unhandled Knex Error: ${error.message}`;
	}
	
	return new Error(organizedMessage);
}