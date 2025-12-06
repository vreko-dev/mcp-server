export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			protected_files: {
				Row: {
					id: string;
					created_at: string;
					protection: string;
					[key: string]: any;
				};
				Insert: {
					id?: string;
					created_at?: string;
					protection: string;
					[key: string]: any;
				};
				Update: {
					id?: string;
					created_at?: string;
					protection?: string;
					[key: string]: any;
				};
			};
			[key: string]: any;
		};
		Views: {
			[key: string]: {
				Row: {
					[key: string]: any;
				};
			};
		};
		Functions: {
			[key: string]: {
				Args: {
					[key: string]: unknown;
				};
				Returns: unknown;
			};
		};
		Enums: {
			[key: string]: string;
		};
		CompositeTypes: {
			[key: string]: {
				[key: string]: unknown;
			};
		};
	};
}
