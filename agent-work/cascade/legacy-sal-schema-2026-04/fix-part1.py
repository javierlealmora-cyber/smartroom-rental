with open(r'C:\Users\javie\SmartRoom-Rental\Proyecto\smartroom-rental\locks-ordered-part1.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'locks_claim_session_id_fkey' in line or 'locks_gateway_link_id_fkey' in line:
        continue
    new_lines.append(line)

content = ''.join(new_lines)
if 'ALTER TABLE public.locks' not in content:
    content += """
ALTER TABLE public.locks
  ADD CONSTRAINT locks_claim_session_id_fkey FOREIGN KEY (claim_session_id) REFERENCES public.lock_claim_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.locks
  ADD CONSTRAINT locks_gateway_link_id_fkey FOREIGN KEY (gateway_link_id) REFERENCES public.gateway_lock_links(id) ON DELETE SET NULL;
"""

with open(r'C:\Users\javie\SmartRoom-Rental\Proyecto\smartroom-rental\locks-ordered-part1.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
