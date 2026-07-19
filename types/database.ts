// Placeholder until the schema exists in Supabase (Milestone 2).
// Will be overwritten by `generate_typescript_types` once the real
// tables/enums are created.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
