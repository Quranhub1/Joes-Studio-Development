-- Business-tier entitlements and hybrid included-usage + optional credit packs.
-- Apply after monetization-expansion.sql. Safe to re-run.
create or replace function public.consume_batch_action_v2(p_user_id uuid,p_included_limit integer,p_bypass_limit boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_month date := date_trunc('month',now() at time zone 'UTC')::date; v_count integer; v_credits integer;
begin
 if p_included_limit < 0 then raise exception 'Invalid included usage limit'; end if;
 insert into public.monthly_usage(user_id,month_key,batch_actions) values(p_user_id,v_month,0) on conflict(user_id,month_key) do nothing;
 select batch_actions into v_count from public.monthly_usage where user_id=p_user_id and month_key=v_month for update;
 if p_bypass_limit then
  update public.monthly_usage set batch_actions=batch_actions+1,updated_at=now() where user_id=p_user_id and month_key=v_month returning batch_actions into v_count;
  return jsonb_build_object('allowed',true,'batch_actions',v_count,'month_key',v_month,'source','admin');
 end if;
 if v_count < p_included_limit then
  update public.monthly_usage set batch_actions=batch_actions+1,updated_at=now() where user_id=p_user_id and month_key=v_month returning batch_actions into v_count;
  return jsonb_build_object('allowed',true,'batch_actions',v_count,'month_key',v_month,'source','included');
 end if;
 insert into public.credit_wallet(user_id,credits) values(p_user_id,0) on conflict(user_id) do nothing;
 select credits into v_credits from public.credit_wallet where user_id=p_user_id for update;
 if coalesce(v_credits,0)<=0 then return jsonb_build_object('allowed',false,'batch_actions',v_count,'month_key',v_month,'credits',0); end if;
 update public.credit_wallet set credits=credits-1,updated_at=now() where user_id=p_user_id returning credits into v_credits;
 insert into public.credit_ledger(user_id,delta,reason) values(p_user_id,-1,'batch_action');
 return jsonb_build_object('allowed',true,'batch_actions',v_count,'month_key',v_month,'source','credit','credits',v_credits);
end; $$;
revoke all on function public.consume_batch_action_v2(uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.consume_batch_action_v2(uuid,integer,boolean) to service_role;
