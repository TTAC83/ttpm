-- Fix impl_generate_weeks to correctly start weeks on Monday
create or replace function impl_generate_weeks()
returns void
language plpgsql
security definer
as $$
declare
  tz text := 'Europe/London';
  first_aug date := make_date(2024,8,1);
  monday date;
  cur date;
  next_monday date;
  avail timestamptz;
begin
  -- first Monday on/after 1 Aug 2024
  monday := first_aug + (((1 - extract(dow from first_aug)::int + 7) % 7));

  -- next Monday relative to now() in Europe/London
  next_monday := (date_trunc('week', (now() at time zone tz)) + interval '7 days')::date;

  cur := monday;
  while cur <= next_monday loop
    -- Monday 00:01 Europe/London, stored as UTC instant
    avail := (cur::timestamp at time zone tz) + interval '1 minute';
    insert into impl_weekly_weeks(week_start, week_end, available_at)
    values (cur, cur + 6, avail)
    on conflict (week_start) do update
      set week_end = excluded.week_end,
          available_at = excluded.available_at;
    cur := cur + 7;
  end loop;
end;
$$;