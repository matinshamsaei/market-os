-- Enforce immutable ledger: wallet_transactions allow INSERT only.
-- Test cleanup may bypass with: SELECT set_config('app.allow_wallet_ledger_mutation', 'on', true);

CREATE OR REPLACE FUNCTION prevent_wallet_transaction_mutation()
RETURNS trigger AS $$
BEGIN
  IF current_setting('app.allow_wallet_ledger_mutation', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'wallet_transactions are immutable: only INSERT is allowed'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_transactions_immutable_update
  BEFORE UPDATE ON "wallet_transactions"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_wallet_transaction_mutation();

CREATE TRIGGER wallet_transactions_immutable_delete
  BEFORE DELETE ON "wallet_transactions"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_wallet_transaction_mutation();
