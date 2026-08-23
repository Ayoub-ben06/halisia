export type NavItem = {
  label: string;
  href: string;
};

export type Database = {
  public: {
    Tables: {
      assets: {
        Row: {
          id: string;
          user_id: string;
          ticker: string | null;
          isin: string | null;
          name: string;
          type: "stock" | "etf";
          quantity: number;
          average_buy_price: number;
          current_price: number | null;
          currency: string;
          broker: string;
          account_type: "PEA" | "CTO" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticker?: string | null;
          isin?: string | null;
          name: string;
          type: "stock" | "etf";
          quantity: number;
          average_buy_price: number;
          current_price?: number | null;
          currency: string;
          broker: string;
          account_type?: "PEA" | "CTO" | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [];
      };
      crypto_assets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          ticker: string;
          quantity: number;
          average_buy_price: number;
          current_price: number;
          total_invested: number;
          currency: string;
          broker: string;
          halal_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["crypto_assets"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crypto_assets"]["Insert"]>;
        Relationships: [];
      };
      gold_assets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          ticker: string;
          quantity_grams: number;
          average_buy_price_per_gram: number;
          current_price_per_gram: number;
          total_invested: number;
          currency: string;
          broker: string;
          halal_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["gold_assets"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gold_assets"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
