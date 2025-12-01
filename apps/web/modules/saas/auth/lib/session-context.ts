// Note: Session type is available from @snapback/auth if needed
// Currently using 'any' for compatibility during transition
import React from "react";

export const SessionContext = React.createContext<
	| {
			// biome-ignore lint/suspicious/noExplicitAny: Session type not yet exported from auth package
			session: any | null;
			// biome-ignore lint/suspicious/noExplicitAny: Session type not yet exported from auth package
			user: any | null;
			loaded: boolean;
			loading?: boolean;
			reloadSession: () => Promise<void>;
	  }
	| undefined
>(undefined);
