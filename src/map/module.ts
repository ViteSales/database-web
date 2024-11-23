export const moduleDependencyMapping = (module: string): string[] => {
	const map = new Map<string, string[]>();
	
	map.set("account-receivable",[
		"debtor",
		"debtor-branch",
		"sales-agent",
	]);
};