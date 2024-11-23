export const moduleDependencyMapping = (module: string): string[] => {
	const map = new Map<string, string[]>();
	
	map.set("account-receivable",[ // here `account-receivable` is module
		"debtor",
		"debtor-branch",
		"sales-agent",
	]);
	
	return [];
};