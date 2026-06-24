\# SmartConversations — Canonical Documentation



The source of truth for SmartConversations documentation is:



\- /docs/smart-conversations/rules/\*.md

\- /docs/smart-conversations/contracts/\*.md

\- /docs/smart-conversations/skills/\*.md

\- /docs/smart-conversations/diagrams/\*.md



Read all markdown files in those folders.



Precedence order when documents overlap or conflict:

1\. rules

2\. contracts

3\. skills

4\. diagrams



Mandatory interpretation rules:

\- Treat rules as non-negotiable constraints.

\- Treat contracts as the formal interfaces and payload definitions.

\- Treat skills as implementation guides that must respect rules and contracts.

\- Treat diagrams as explanatory aids, never as the primary source if they conflict with rules or contracts.



Do not invent alternative architectures if the documentation already defines one.

Do not replace Wasender for the WhatsApp channel.

Do not bypass the Integration API to access SmartRoom Core data.

Do not weaken identity-validation requirements.

