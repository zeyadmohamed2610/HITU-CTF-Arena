
DROP POLICY "Anon can insert activity logs" ON public.activity_logs;

CREATE POLICY "System can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
