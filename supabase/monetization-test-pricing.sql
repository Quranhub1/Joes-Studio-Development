-- Joes Studio test pricing plans. Apply after monetization.sql and monetization-expansion.sql.
-- Prices are proposed test prices, not validated against operating costs.
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('free','pro','pro_annual','business','business_annual','institution','hourly'));
alter table public.payment_requests drop constraint if exists payment_requests_plan_check;
alter table public.payment_requests add constraint payment_requests_plan_check
  check (plan in ('pro','pro_annual','business','business_annual','institution','hourly'));
-- Keep existing subscriber expiry timestamps intact while mapping legacy tiers.
update public.subscriptions set plan='pro' where plan in ('daily','weekly','monthly');
update public.payment_requests set plan='pro' where plan in ('daily','weekly','monthly');
