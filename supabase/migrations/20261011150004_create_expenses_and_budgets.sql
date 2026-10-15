-- ============================================================================
-- Migration 04: Expenses & Trip Budgets Tables, Constraints, Indexes & Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Expenses Table
-- Monetary amounts are stored strictly as integer minor units (e.g. cents).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL,
  paid_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_amount_positive CHECK (amount >= 0),
  CONSTRAINT expenses_currency_check CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD')),
  CONSTRAINT expenses_category_check CHECK (category IN (
    'accommodation', 'transportation', 'food_drinks', 'activities', 'shopping', 'flights', 'other'
  ))
);

-- Performance & Aggregation Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_date ON public.expenses(trip_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_currency ON public.expenses(trip_id, currency);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_category ON public.expenses(trip_id, category);

-- Trigger for automated updated_at timestamps
CREATE OR REPLACE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- Trip Budgets Table
-- 1:1 relationship with parent trip; stored in integer minor units.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_budgets (
  trip_id UUID PRIMARY KEY REFERENCES public.trips(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budget_amount_positive CHECK (amount >= 0),
  CONSTRAINT budget_currency_check CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD'))
);

-- Trigger for automated updated_at timestamps
CREATE OR REPLACE TRIGGER set_trip_budgets_updated_at
  BEFORE UPDATE ON public.trip_budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
