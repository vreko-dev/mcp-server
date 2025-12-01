import { useQuery } from "@tanstack/react-query";

export const sessionQueryKey = ["user", "session"] as const;

export const useSessionQuery = () => {
	return useQuery({
		queryKey: sessionQueryKey,
		queryFn: async () => {
			// TODO: Replace with actual auth client when backend is ready
			// const { data, error } = await authClient.getSession({ query: { disableCookieCache: true } });
			const { data, error } = { data: null, error: null };

			if (error) {
				throw new Error("Failed to fetch session");
			}

			return data;
		},
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: true,
	});
};

export const userAccountQueryKey = ["user", "accounts"] as const;
export const useUserAccountsQuery = () => {
	return useQuery({
		queryKey: userAccountQueryKey,
		queryFn: async () => {
			// TODO: Replace with actual auth client when backend is ready
			// const { data, error } = await authClient.listAccounts();
			const { data, error } = { data: null, error: null };

			if (error) {
				throw error;
			}

			return data;
		},
	});
};

export const userPasskeyQueryKey = ["user", "passkeys"] as const;
export const useUserPasskeysQuery = () => {
	return useQuery({
		queryKey: userPasskeyQueryKey,
		queryFn: async () => {
			// TODO: Replace with actual auth client when backend is ready
			// const { data, error } = await authClient.passkey.listUserPasskeys();
			const { data, error } = { data: null, error: null };

			if (error) {
				throw error;
			}

			return data;
		},
	});
};
