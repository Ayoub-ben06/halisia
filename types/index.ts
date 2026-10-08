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
          type: "stock" | "etf" | "crypto" | "gold" | "cash";
          quantity: number;
          average_buy_price: number;
          current_price: number | null;
          currency: string;
          broker: string;
          account_type: "PEA" | "CTO" | "Compte crypto" | "Autre" | null;
          purchase_date: string | null;
          halal_status: "compliant" | "non_compliant" | "debated" | "unknown";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticker?: string | null;
          isin?: string | null;
          name: string;
          type: "stock" | "etf" | "crypto" | "gold" | "cash";
          quantity: number;
          average_buy_price: number;
          current_price?: number | null;
          currency: string;
          broker: string;
          account_type?: "PEA" | "CTO" | "Compte crypto" | "Autre" | null;
          purchase_date?: string | null;
          halal_status?: "compliant" | "non_compliant" | "debated" | "unknown";
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
        Insert: Omit<
          Database["public"]["Tables"]["crypto_assets"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crypto_assets"]["Insert"]
        >;
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
        Insert: Omit<
          Database["public"]["Tables"]["gold_assets"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gold_assets"]["Insert"]>;
        Relationships: [];
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          ticker: string;
          isin: string | null;
          name: string;
          exchange: string | null;
          type: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticker: string;
          isin?: string | null;
          name: string;
          exchange?: string | null;
          type?: string;
          added_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["watchlist"]["Insert"]>;
        Relationships: [];
      };
      watchlist_alerts: {
        Row: {
          id: string;
          user_id: string;
          ticker: string;
          name: string;
          alert_type: "halal_change" | "price_target";
          price_target: number | null;
          is_active: boolean;
          last_triggered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticker: string;
          name: string;
          alert_type: "halal_change" | "price_target";
          price_target?: number | null;
          is_active?: boolean;
          last_triggered_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["watchlist_alerts"]["Insert"]>;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          daily_summary_enabled: boolean;
          price_alerts_enabled: boolean;
          compliance_alerts_enabled: boolean;
          annual_zakat_reminder_enabled: boolean;
          zakat_payment_date: string | null;
          zakat_reminder_last_sent_for: string | null;
          created_at: string;
          updated_at: string;
          currency: string;
          language: string;
          nisab_type: string;
          fiscal_year_start: string;
          halal_change_alert: boolean;
          purification_alert: boolean;
          weekly_compliance_report: boolean;
          zakat_reminder: boolean;
          bitcoin_zakatable: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          daily_summary_enabled?: boolean;
          price_alerts_enabled?: boolean;
          compliance_alerts_enabled?: boolean;
          annual_zakat_reminder_enabled?: boolean;
          zakat_payment_date?: string | null;
          zakat_reminder_last_sent_for?: string | null;
          created_at?: string;
          updated_at?: string;
          currency?: string;
          language?: string;
          nisab_type?: string;
          fiscal_year_start?: string;
          halal_change_alert?: boolean;
          purification_alert?: boolean;
          weekly_compliance_report?: boolean;
          zakat_reminder?: boolean;
          bitcoin_zakatable?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
        Relationships: [];
      };
      user_profiles: {
        Row: { id: string; first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; first_name?: string | null; last_name?: string | null; phone?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
        Relationships: [];
      };
      zakat_profile: {
        Row: { user_id: string; start_date: string; include_bitcoin: boolean; include_income: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; start_date: string; include_bitcoin?: boolean; include_income?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["zakat_profile"]["Insert"]>;
        Relationships: [];
      };
      premium_waitlist: {
        Row: { id: string; email: string; user_id: string | null; created_at: string };
        Insert: { id?: string; email: string; user_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["premium_waitlist"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string | null;
          plan: "monthly" | "yearly";
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          stripe_price_id?: string | null;
          plan: "monthly" | "yearly";
          status: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      screening_cache: {
        Row: {
          ticker: string;
          status: string;
          previous_status: string | null;
          purification_ratio: number | null;
          reason: string | null;
          error: string | null;
          result: unknown | null;
          screened_at: string;
        };
        Insert: {
          ticker: string;
          status: string;
          previous_status?: string | null;
          purification_ratio?: number | null;
          reason?: string | null;
          error?: string | null;
          result?: unknown | null;
          screened_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["screening_cache"]["Insert"]>;
        Relationships: [];
      };
      waitlist: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id?: string; email: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["waitlist"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          asset_name: string;
          asset_ticker: string;
          asset_class: "stock" | "etf" | "crypto" | "gold" | "cash";
          side: "buy" | "sell";
          account_type: string | null;
          transaction_date: string;
          quantity: number;
          price_eur: number;
          amount_eur: number;
          fee_eur: number;
          broker: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id?: string;
          asset_name: string;
          asset_ticker: string;
          asset_class: "stock" | "etf" | "crypto" | "gold" | "cash";
          side?: "buy" | "sell";
          account_type?: string | null;
          transaction_date: string;
          quantity: number;
          price_eur: number;
          amount_eur: number;
          fee_eur?: number;
          broker?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
      zakat_payments: {
        Row: {
          id: string;
          user_id: string;
          paid_at: string;
          amount: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          paid_at?: string;
          amount: number;
          currency?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["zakat_payments"]["Insert"]>;
        Relationships: [];
      };
      compliance_changes: {
        Row: {
          id: string;
          user_id: string;
          ticker: string;
          isin: string | null;
          name: string | null;
          previous_status: string | null;
          new_status: string | null;
          change_date: string;
          day_30_deadline: string | null;
          day_90_deadline: string | null;
          resolved: boolean;
          resolution: "sold" | "restored_compliant" | "purified" | null;
          resolved_at: string | null;
          notified_at: string | null;
          reminder_30_sent_at: string | null;
          reminder_85_sent_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticker: string;
          isin?: string | null;
          name?: string | null;
          previous_status?: string | null;
          new_status?: string | null;
          change_date?: string;
          day_30_deadline?: string | null;
          day_90_deadline?: string | null;
          resolved?: boolean;
          resolution?: "sold" | "restored_compliant" | "purified" | null;
          resolved_at?: string | null;
          notified_at?: string | null;
          reminder_30_sent_at?: string | null;
          reminder_85_sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["compliance_changes"]["Insert"]>;
        Relationships: [];
      };
      etf_screening: {
        Row: {
          id: string; ticker: string; isin: string | null; name: string; etf_type: "islamic_certified" | "bond" | "conventional"; provider: string | null;
          total_holdings: number; analyzed_holdings: number; compliant_weight: number; doubtful_weight: number; non_compliant_weight: number; unanalyzed_weight: number; purification_ratio: number;
          verdict: "compliant" | "doubtful" | "non_compliant" | "bond_forbidden" | null; verdict_reason: string | null; top_non_compliant: unknown; halal_alternative: string | null; halal_alternative_name: string | null; composition_date: string | null; last_updated: string; next_update: string | null;
        };
        Insert: { id?: string; ticker: string; isin?: string | null; name: string; etf_type: "islamic_certified" | "bond" | "conventional"; provider?: string | null; total_holdings?: number; analyzed_holdings?: number; compliant_weight?: number; doubtful_weight?: number; non_compliant_weight?: number; unanalyzed_weight?: number; purification_ratio?: number; verdict?: "compliant" | "doubtful" | "non_compliant" | "bond_forbidden" | null; verdict_reason?: string | null; top_non_compliant?: unknown; halal_alternative?: string | null; halal_alternative_name?: string | null; composition_date?: string | null; last_updated?: string; next_update?: string | null };
        Update: Partial<Database["public"]["Tables"]["etf_screening"]["Insert"]>;
        Relationships: [];
      };
      etf_holdings: {
        Row: { id: string; etf_ticker: string; holding_ticker: string | null; holding_isin: string | null; holding_name: string; weight: number; halal_status: string | null; halal_reason: string | null; last_screened: string };
        Insert: { id?: string; etf_ticker: string; holding_ticker?: string | null; holding_isin?: string | null; holding_name: string; weight: number; halal_status?: string | null; halal_reason?: string | null; last_screened?: string };
        Update: Partial<Database["public"]["Tables"]["etf_holdings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
