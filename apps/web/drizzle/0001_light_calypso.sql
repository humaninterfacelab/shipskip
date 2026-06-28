ALTER TABLE "tasks" DROP COLUMN "template";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "system_prompt";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "prompt";--> statement-breakpoint
INSERT INTO "tasks" (id, title) VALUES
  ('next-app/software-engineer-portfolio', 'Software Engineer Portfolio'),
  ('next-app/operations-dashboard', 'Operations Dashboard'),
  ('next-app/saas-landing-page', 'SaaS Landing Page')
ON CONFLICT (id) DO NOTHING;