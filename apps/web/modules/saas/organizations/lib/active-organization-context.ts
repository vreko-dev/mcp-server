// Note: ActiveOrganization type is available from @snapback/auth if needed
// Currently using 'any' for compatibility during transition
import React from "react";

export const ActiveOrganizationContext = React.createContext<
	| {
			// biome-ignore lint/suspicious/noExplicitAny: ActiveOrganization type not yet exported from auth package
			activeOrganization: any | null;
			// biome-ignore lint/suspicious/noExplicitAny: ActiveOrganization type not yet exported from auth package
			activeOrganizationUserRole: any | null;
			isOrganizationAdmin: boolean;
			loaded: boolean;
			setActiveOrganization: (organizationId: string | null) => Promise<void>;
			refetchActiveOrganization: () => Promise<void>;
	  }
	| undefined
>(undefined);
